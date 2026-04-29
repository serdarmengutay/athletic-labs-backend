/**
 * Historical Athletes Controller
 * Excel import for benchmark data
 */
import { Request, Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { HistoricalAthleteData } from "../models";
import { normalizeGender } from "../config/gender";
import {
  mapExcelRow,
  ParsedHistoricalRow,
} from "../utils/historicalImport";

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

/**
 * POST /api/historical-athletes/import
 * Import historical athlete data from Excel file
 */
export const importHistoricalAthletes = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel dosyası gerekli",
      });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet);
    const rows: ParsedHistoricalRow[] = rawRows.map(mapExcelRow);

    let importedRows = 0;
    let skippedRows = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel rows start at 1, plus header

      // birthYear is required
      if (!row.birthYear) {
        skippedRows++;
        errors.push(`Satır ${rowNum}: birthYear eksik`);
        continue;
      }

      // TODO: Add validation for numeric fields
      // TODO: Add deduplication logic

      try {
        await HistoricalAthleteData.create({
          birth_year: Number(row.birthYear),
          gender: normalizeGender(row.gender),
          height: row.height ?? null,
          weight: row.weight ?? null,
          bmi: row.bmi ?? null,
          flexibility: row.flexibility ?? null,
          sprint_30m: row.sprint30 ?? null,
          sprint_30m_second: row.sprint30_2 ?? null,
          agility: row.agility ?? null,
          vertical_jump: row.verticalJump ?? null,
          pass_count: row.passCount ?? null,
          ffmi: row.ffmi ?? null,
          fatigue_index: row.fatigueIndex ?? null,
        });
        importedRows++;
      } catch (err) {
        skippedRows++;
        errors.push(
          `Satır ${rowNum}: ${
            err instanceof Error ? err.message : "Bilinmeyen hata"
          }`
        );
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        totalRows: rows.length,
        importedRows,
        skippedRows,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Show first 10 errors
      },
      message: `${importedRows} kayıt başarıyla eklendi`,
    });
  } catch (error) {
    console.error("importHistoricalAthletes error:", error);
    return res.status(500).json({
      success: false,
      message: "Excel import hatası",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

/**
 * GET /api/historical-athletes
 * List all historical athlete data
 */
export const getAllHistoricalAthletes = async (
  _req: Request,
  res: Response
) => {
  try {
    const data = await HistoricalAthleteData.findAll({
      order: [["birth_year", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    console.error("getAllHistoricalAthletes error:", error);
    return res.status(500).json({
      success: false,
      message: "Veri getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

/**
 * GET /api/historical-athletes/stats
 * Get statistics about historical data
 */
export const getHistoricalStats = async (_req: Request, res: Response) => {
  try {
    const totalCount = await HistoricalAthleteData.count();
    const byBirthYear = await HistoricalAthleteData.findAll({
      attributes: ["birth_year"],
      group: ["birth_year"],
      order: [["birth_year", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: {
        totalRecords: totalCount,
        birthYears: byBirthYear.map((r) => r.birth_year),
        birthYearCount: byBirthYear.length,
      },
    });
  } catch (error) {
    console.error("getHistoricalStats error:", error);
    return res.status(500).json({
      success: false,
      message: "İstatistik getirilirken hata oluştu",
    });
  }
};
