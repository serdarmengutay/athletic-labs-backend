/**
 * Historical Tests Controller
 * Import historical athlete test data from Excel and generate reports
 * Supports Turkish Excel headers
 */
import { Request, Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import {
  TestSession,
  Athlete,
  AthleteTest,
  Measurement,
  HistoricalAthleteData,
} from "../models";
import sequelize from "../config/database";
import {
  generateAthleteReport,
  NoBenchmarkDataError,
} from "../services/calculationService";

// Configure multer for memory storage
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Sadece Excel dosyaları (.xlsx) kabul edilir"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Turkish header to internal field mapping
// TODO: Add CSV support in the future
const TURKISH_HEADER_MAP: Record<string, string> = {
  "ADI SOYADI": "athleteName",
  "AD SOYAD": "athleteName",
  İSİM: "athleteName",
  "SPORCU ADI": "athleteName",
  "DOĞUM TARİHİ": "birthYear",
  "DOGUM TARIHI": "birthYear",
  "DOĞUM YILI": "birthYear",
  YAŞ: "birthYear",
  BOY: "height",
  "BOY (CM)": "height",
  KILO: "weight",
  KİLO: "weight",
  AĞIRLIK: "weight",
  AGIRLIK: "weight",
  ESNEKLİK: "flexibility",
  ESNEKLIK: "flexibility",
  "30 METRE": "sprint30",
  "30M": "sprint30",
  "30 M": "sprint30",
  "İKİNCİ 30 METRE": "sprint30_2",
  "IKINCI 30 METRE": "sprint30_2",
  "2. 30 METRE": "sprint30_2",
  "30 METRE 2": "sprint30_2",
  ÇEVİKLİK: "agility",
  CEVIKLIK: "agility",
  "DİKEY SIÇRAMA": "verticalJump",
  "DIKEY SICRAMA": "verticalJump",
  SIÇRAMA: "verticalJump",
  FFMI: "ffmi",
};

interface MappedRow {
  athleteName?: string;
  birthYear?: number;
  height?: number;
  weight?: number;
  flexibility?: number;
  sprint30?: number;
  sprint30_2?: number;
  agility?: number;
  verticalJump?: number;
  ffmi?: number;
}

/**
 * Normalize header string for matching
 */
function normalizeHeader(header: string): string {
  return header.toString().trim().toUpperCase().replace(/\s+/g, " ");
}

/**
 * Parse birth year from various formats
 */
function parseBirthYear(value: any): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // If it's already a number
  if (typeof value === "number") {
    // Check if it looks like a year (4 digits, reasonable range)
    if (value >= 1900 && value <= 2100) {
      return Math.floor(value);
    }
    // Excel serial date number - dates since 1900-01-01
    if (value > 30000 && value < 50000) {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.getFullYear();
    }
    return null;
  }

  // If it's a Date object
  if (value instanceof Date) {
    return value.getFullYear();
  }

  // If it's a string
  if (typeof value === "string") {
    const trimmed = value.trim();

    // Try to extract year from date string (DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD)
    const datePatterns = [
      /(\d{4})[-\/\.]\d{1,2}[-\/\.]\d{1,2}/, // YYYY-MM-DD
      /\d{1,2}[-\/\.]\d{1,2}[-\/\.](\d{4})/, // DD-MM-YYYY
    ];

    for (const pattern of datePatterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        const year = parseInt(match[1], 10);
        if (year >= 1900 && year <= 2100) {
          return year;
        }
      }
    }

    // Try direct parse as number
    const parsed = parseInt(trimmed, 10);
    if (!isNaN(parsed) && parsed >= 1900 && parsed <= 2100) {
      return parsed;
    }
  }

  return null;
}

/**
 * Map Excel row to internal format using Turkish headers
 */
function mapExcelRow(rawRow: Record<string, any>): MappedRow {
  const mapped: MappedRow = {};

  for (const [rawHeader, value] of Object.entries(rawRow)) {
    const normalizedHeader = normalizeHeader(rawHeader);
    const internalField = TURKISH_HEADER_MAP[normalizedHeader];

    if (
      internalField &&
      value !== null &&
      value !== undefined &&
      value !== ""
    ) {
      switch (internalField) {
        case "athleteName":
          mapped.athleteName = String(value).trim();
          break;
        case "birthYear":
          mapped.birthYear = parseBirthYear(value) ?? undefined;
          break;
        case "height":
          mapped.height = parseFloat(value) || undefined;
          break;
        case "weight":
          mapped.weight = parseFloat(value) || undefined;
          break;
        case "flexibility":
          mapped.flexibility = parseFloat(value) || undefined;
          break;
        case "sprint30":
          mapped.sprint30 = parseFloat(value) || undefined;
          break;
        case "sprint30_2":
          mapped.sprint30_2 = parseFloat(value) || undefined;
          break;
        case "agility":
          mapped.agility = parseFloat(value) || undefined;
          break;
        case "verticalJump":
          mapped.verticalJump = parseFloat(value) || undefined;
          break;
        case "ffmi":
          mapped.ffmi = parseFloat(value) || undefined;
          break;
      }
    }
  }

  return mapped;
}

interface ImportError {
  row: number;
  athleteName?: string;
  reason: string;
}

/**
 * POST /api/historical-tests/import
 * Import historical athlete test data and generate reports
 * Uses per-row transactions for safety
 * Supports Turkish Excel headers
 */
export const importHistoricalTests = async (req: Request, res: Response) => {
  console.log("[Historical Import] Starting import...");

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel dosyası gerekli",
      });
    }

    // Parse Excel file with date parsing enabled
    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellDates: true,
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
      raw: true,
    });

    console.log(`[Historical Import] Parsed ${rawRows.length} rows from Excel`);

    // Log detected headers for debugging
    if (rawRows.length > 0) {
      const headers = Object.keys(rawRows[0]);
      console.log(
        `[Historical Import] Detected headers: ${headers.join(", ")}`
      );
    }

    if (rawRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Excel dosyası boş",
      });
    }

    // Create a virtual historical TestSession (outside row transactions)
    const testSession = await TestSession.create({
      club_name: "Historical Import",
      club_responsible_name: "System Import",
      city: "N/A",
      sport_type: "Historical",
      test_date: new Date(),
      status: "completed",
      notes: `Imported from Excel at ${new Date().toISOString()}`,
    });

    console.log(`[Historical Import] Created TestSession: ${testSession.id}`);

    let importedCount = 0;
    let failedCount = 0;
    const errors: ImportError[] = [];
    const reports: any[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const rawRow = rawRows[i];
      const rowNum = i + 2; // Excel rows start at 1, plus header

      // Map Turkish headers to internal fields
      const row = mapExcelRow(rawRow);

      // birthYear is required
      if (!row.birthYear) {
        failedCount++;
        errors.push({
          row: rowNum,
          athleteName: row.athleteName,
          reason: `DOĞUM TARİHİ eksik veya geçersiz format. Raw değer: ${JSON.stringify(
            rawRow["DOĞUM TARİHİ"] || rawRow["DOGUM TARIHI"] || "boş"
          )}`,
        });
        console.log(
          `[Historical Import] Row ${rowNum}: FAILED - birthYear missing or invalid`
        );
        continue;
      }

      // TODO: Add deduplication logic based on athleteName + birthYear

      // Start transaction for this row
      const transaction = await sequelize.transaction();

      try {
        console.log(
          `[Historical Import] Row ${rowNum}: Processing ${
            row.athleteName || "Unknown"
          } (birth: ${row.birthYear})...`
        );

        // Create Athlete record
        const athlete = await Athlete.create(
          {
            full_name: row.athleteName || `Athlete_${rowNum}`,
            birth_year: row.birthYear,
          },
          { transaction }
        );

        // Create AthleteTest record (already completed)
        const athleteTest = await AthleteTest.create(
          {
            test_session_id: testSession.id,
            athlete_id: athlete.id,
            is_completed: true,
            completed_at: new Date(),
          },
          { transaction }
        );

        // Create Measurement record with data from Excel
        await Measurement.create(
          {
            athlete_test_id: athleteTest.id,
            height: row.height ?? null,
            weight: row.weight ?? null,
            flexibility: row.flexibility ?? null,
            sprint_30m: row.sprint30 ?? null,
            sprint_30m_second: row.sprint30_2 ?? null,
            agility: row.agility ?? null,
            vertical_jump: row.verticalJump ?? null,
            ffmi: row.ffmi ?? null,
          },
          { transaction }
        );

        // Also create HistoricalAthleteData record for benchmark pool
        await HistoricalAthleteData.create(
          {
            birth_year: row.birthYear,
            height: row.height ?? null,
            weight: row.weight ?? null,
            flexibility: row.flexibility ?? null,
            sprint_30m: row.sprint30 ?? null,
            sprint_30m_second: row.sprint30_2 ?? null,
            agility: row.agility ?? null,
            vertical_jump: row.verticalJump ?? null,
            ffmi: row.ffmi ?? null,
          },
          { transaction }
        );

        // Commit transaction
        await transaction.commit();
        console.log(
          `[Historical Import] Row ${rowNum}: Database records created`
        );

        // Generate report (outside transaction - already committed)
        try {
          const athleteTestWithAssoc = await AthleteTest.findByPk(
            athleteTest.id,
            {
              include: [
                { association: "athlete" },
                { association: "measurement" },
              ],
            }
          );

          if (athleteTestWithAssoc) {
            const report = await generateAthleteReport(
              athleteTestWithAssoc,
              (athleteTestWithAssoc as any).measurement
            );
            reports.push(report);
            console.log(
              `[Historical Import] Row ${rowNum}: Report generated successfully`
            );
          }
        } catch (reportErr) {
          // Report generation failed but data was saved
          console.warn(
            `[Historical Import] Row ${rowNum}: Report generation failed - ${
              reportErr instanceof Error ? reportErr.message : reportErr
            }`
          );
        }

        importedCount++;
      } catch (err) {
        // Rollback transaction for this row only
        await transaction.rollback();
        failedCount++;
        const errorMsg = err instanceof Error ? err.message : "Bilinmeyen hata";
        errors.push({
          row: rowNum,
          athleteName: row.athleteName,
          reason: errorMsg,
        });
        console.error(
          `[Historical Import] Row ${rowNum}: Failed and rolled back - ${errorMsg}`
        );
      }
    }

    console.log(
      `[Historical Import] Completed: ${importedCount} imported, ${failedCount} failed, ${reports.length} reports`
    );

    return res.status(200).json({
      success: true,
      data: {
        testSessionId: testSession.id,
        totalRows: rawRows.length,
        imported: importedCount,
        failed: failedCount,
        reportsGenerated: reports.length,
        reports,
        errors: errors.length > 0 ? errors : undefined,
      },
      message: `${importedCount} kayıt başarıyla import edildi, ${failedCount} başarısız, ${reports.length} rapor oluşturuldu`,
    });
  } catch (error) {
    console.error("[Historical Import] Fatal error:", error);
    return res.status(500).json({
      success: false,
      message: "Historical test import hatası",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

/**
 * GET /api/historical-tests
 * List all historical test sessions
 */
export const getAllHistoricalTests = async (_req: Request, res: Response) => {
  try {
    const sessions = await TestSession.findAll({
      where: { sport_type: "Historical" },
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error("getAllHistoricalTests error:", error);
    return res.status(500).json({
      success: false,
      message: "Historical test sessions getirilirken hata oluştu",
    });
  }
};
