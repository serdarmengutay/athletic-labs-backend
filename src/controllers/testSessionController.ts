// MVP Test Sessions Controller
import { Request, Response } from "express";
import {
  TestSession,
  Athlete,
  AthleteTest,
  Measurement,
  XOneReportImport,
  sequelize,
} from "../models";
import { Op, UniqueConstraintError } from "sequelize";
import * as XLSX from "xlsx";
import { normalizeGender } from "../config/gender";
import {
  generateAthleteReport,
  generateFrontendAthleteReport,
  AthleteReport,
  FrontendAthleteReport,
  NoBenchmarkDataError,
} from "../services/calculationService";
import { normalizeXOnePayload } from "../services/xOneImportService";
import { parseYoujiuQrUrl, YoujiuApiClient } from "../services/youjiuClient";

// Required measurement fields for marking test as complete
const REQUIRED_MEASUREMENT_FIELDS = [
  "height",
  "weight",
  "flexibility",
  "sprint_30m",
  "agility",
  "vertical_jump",
  "pass_count",
];

function requiredMeasurementFields(valdEnabled: boolean): string[] {
  return valdEnabled
    ? REQUIRED_MEASUREMENT_FIELDS.filter((field) => field !== "vertical_jump")
    : REQUIRED_MEASUREMENT_FIELDS;
}

function applyTemporaryValdReportRules(
  report: FrontendAthleteReport,
  valdEnabled: boolean,
): FrontendAthleteReport {
  if (!valdEnabled) return report;

  report.metrics.verticalJump = {
    value: null,
    score: null,
    percentile: null,
    target: null,
  };
  if (report.measurements) {
    delete report.measurements.verticalJump;
  }
  if (report.ageGroupAverages) {
    report.ageGroupAverages.verticalJump = null;
  }
  if (report.ageGroupPercentiles) {
    report.ageGroupPercentiles.verticalJump = null;
  }

  const includedScores = [
    report.metrics.sprint1.score,
    report.metrics.sprint2.score,
    report.metrics.agility.score,
    report.metrics.flexibility.score,
    report.metrics.passCount.score,
  ].filter((score): score is number => score !== null && score !== undefined);
  report.overallPerformance =
    includedScores.length > 0
      ? Number(
          (
            includedScores.reduce((sum, score) => sum + score, 0) /
            includedScores.length
          ).toFixed(1),
        )
      : 0;

  return report;
}

const DEFAULT_VALD_CONFIG = {
  schemaVersion: 1,
  disabledManualFields: [],
  expectedMetrics: [],
};

function normalizeValdConfig(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_VALD_CONFIG };
  }

  const config = value as Record<string, unknown>;
  return {
    ...config,
    schemaVersion:
      typeof config.schemaVersion === "number" ? config.schemaVersion : 1,
    disabledManualFields: Array.isArray(config.disabledManualFields)
      ? config.disabledManualFields
      : [],
    expectedMetrics: Array.isArray(config.expectedMetrics)
      ? config.expectedMetrics
      : [],
  };
}

function parseDateOrNull(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function numberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function excelNumber(value: unknown): number | null {
  const parsed = numberOrUndefined(value);
  return parsed === undefined ? null : parsed;
}

function formatExcelDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function buildYoujiSummary(
  xOneImport?: XOneReportImport | null,
): FrontendAthleteReport["youjiSummary"] | undefined {
  if (!xOneImport?.qr_url) return undefined;

  return {
    deviceReportUrl: xOneImport.qr_url,
    reportId: xOneImport.report_id,
    measurementTime: xOneImport.measurement_time
      ? xOneImport.measurement_time.toISOString()
      : undefined,
    bodyFatPercent: numberOrUndefined(xOneImport.body_fat_percent),
    mineralAmount: numberOrUndefined(xOneImport.mineral_amount),
    proteinAmount: numberOrUndefined(xOneImport.protein_amount),
  };
}

/**
 * POST /api/test-sessions/:id/calculate-report
 * Calculate performance report for all athletes in a test session
 *
 * Response format matches frontend expectations exactly:
 * {
 *   testSessionId: string,
 *   clubName: string,
 *   reportGeneratedAt: string (ISO),
 *   athletes: FrontendAthleteReport[]
 * }
 */
export const calculateReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Load test session
    const testSession = await TestSession.findByPk(id);
    if (!testSession) {
      return res.status(404).json({
        error: "Test oturumu bulunamadı",
        code: "TEST_SESSION_NOT_FOUND",
      });
    }

    // 2. Load all athletes in this session
    const athleteTests = await AthleteTest.findAll({
      where: {
        test_session_id: id,
        status: { [Op.notIn]: ["absent", "skipped"] },
      },
      include: [
        { association: "athlete" },
        { association: "measurement" },
        { association: "testSession" },
      ],
      order: [["created_at", "ASC"]],
    });

    if (athleteTests.length === 0) {
      return res.status(400).json({
        error: "Bu oturumda sporcu bulunmuyor",
        code: "NO_ATHLETES_IN_SESSION",
      });
    }

    const xOneImports = await XOneReportImport.findAll({
      where: {
        athlete_test_id: athleteTests.map((athleteTest) => athleteTest.id),
      },
      order: [["created_at", "DESC"]],
    });
    const latestXOneImportByAthleteTestId = new Map<string, XOneReportImport>();
    for (const xOneImport of xOneImports) {
      if (!latestXOneImportByAthleteTestId.has(xOneImport.athlete_test_id)) {
        latestXOneImportByAthleteTestId.set(
          xOneImport.athlete_test_id,
          xOneImport,
        );
      }
    }

    // 3. Generate reports for each athlete
    const athletes: FrontendAthleteReport[] = [];
    const warnings: { athleteId: string; fullName: string; warning: string }[] =
      [];

    for (const athleteTest of athleteTests) {
      const measurement = (athleteTest as any).measurement;
      const athlete = (athleteTest as any).athlete;

      try {
        // generateFrontendAthleteReport handles missing measurements and benchmark data gracefully
        const report = applyTemporaryValdReportRules(
          await generateFrontendAthleteReport(athleteTest, measurement),
          testSession.vald_enabled,
        );
        const youjiSummary = buildYoujiSummary(
          latestXOneImportByAthleteTestId.get(athleteTest.id),
        );
        if (youjiSummary) {
          report.youjiSummary = youjiSummary;
        }
        athletes.push(report);

        // Add warning if no benchmark data (percentiles will be null)
        if (measurement && report.metrics.sprint1.percentile === null) {
          warnings.push({
            athleteId: athlete.id,
            fullName: athlete.full_name,
            warning: `${athlete.birth_year} doğum yılı ve ${athlete.gender} grubu için yeterli benchmark verisi bulunamadı`,
          });
        }
      } catch (err) {
        // Even on error, add athlete with null metrics
        athletes.push({
          athleteId: athlete?.id,
          fullName: athlete?.full_name || "Unknown",
          birthYear: athlete?.birth_year || 0,
          measurements: {},
          ageGroupAverages: {
            sprint1: null,
            sprint2: null,
            agility: null,
            flexibility: null,
            verticalJump: null,
            passCount: null,
            bmi: null,
          },
          ageGroupPercentiles: {
            sprint1: null,
            sprint2: null,
            agility: null,
            flexibility: null,
            verticalJump: null,
            passCount: null,
            bmi: null,
          },
          metrics: {
            sprint1: { value: null, score: null, percentile: null, target: null },
            sprint2: { value: null, score: null, percentile: null, target: null },
            agility: { value: null, score: null, percentile: null, target: null },
            flexibility: { value: null, score: null, percentile: null, target: null },
            verticalJump: { value: null, score: null, percentile: null, target: null },
            passCount: { value: null, score: null, percentile: null, target: null },
            bmi: { value: null, score: null, percentile: null, target: null },
            fatigueIndex: { value: null, score: null, percentile: null, target: null },
          },
          youjiSummary: buildYoujiSummary(
            latestXOneImportByAthleteTestId.get(athleteTest.id),
          ),
          overallPerformance: 0,
        });

        warnings.push({
          athleteId: athlete?.id,
          fullName: athlete?.full_name || "Unknown",
          warning: err instanceof Error ? err.message : "Bilinmeyen hata",
        });
      }
    }

    // 4. Update session status if all have reports
    if (athletes.length > 0 && testSession.status !== "completed") {
      testSession.status = "completed";
      await testSession.save();
    }

    // 5. Return frontend-compatible response
    return res.status(200).json({
      testSessionId: id,
      clubName: testSession.club_name,
      valdEnabled: testSession.vald_enabled,
      testDate: testSession.test_date,
      reportGeneratedAt: new Date().toISOString(),
      athletes,
      // Include warnings as optional field for debugging
      ...(warnings.length > 0 && { warnings }),
    });
  } catch (error) {
    console.error("calculateReport error:", error);
    return res.status(500).json({
      error: "Rapor oluşturulurken hata oluştu",
      code: "INTERNAL_SERVER_ERROR",
      details: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

/**
 * POST /api/test-sessions
 * Create a new test session
 */
export const createTestSession = async (req: Request, res: Response) => {
  try {
    const {
      clubName,
      clubResponsibleName,
      clubResponsibleEmail,
      clubResponsiblePhone,
      city,
      sportType,
      testDate,
      notes,
      valdEnabled = false,
      valdConfig,
    } = req.body;

    // Validation
    if (!clubName || !clubResponsibleName || !city || !sportType || !testDate) {
      return res.status(400).json({
        success: false,
        message:
          "Kulüp adı, sorumlu adı, şehir, spor tipi ve test tarihi gerekli",
      });
    }

    const testSession = await TestSession.create({
      club_name: clubName,
      club_responsible_name: clubResponsibleName,
      club_responsible_email: clubResponsibleEmail || null,
      club_responsible_phone: clubResponsiblePhone || null,
      city,
      sport_type: sportType,
      vald_enabled: Boolean(valdEnabled),
      vald_config: normalizeValdConfig(valdConfig),
      test_date: new Date(testDate),
      status: "draft", // Default status
      notes: notes || null,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: testSession.id,
        clubName: testSession.club_name,
        clubResponsibleName: testSession.club_responsible_name,
        clubResponsibleEmail: testSession.club_responsible_email,
        clubResponsiblePhone: testSession.club_responsible_phone,
        city: testSession.city,
        sportType: testSession.sport_type,
        valdEnabled: testSession.vald_enabled,
        valdConfig: testSession.vald_config,
        testDate: testSession.test_date,
        status: testSession.status,
        notes: testSession.notes,
        createdAt: testSession.created_at,
      },
      message: "Test oturumu başarıyla oluşturuldu",
    });
  } catch (error) {
    console.error("createTestSession error:", error);
    return res.status(500).json({
      success: false,
      message: "Test oturumu oluşturulurken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

/**
 * POST /api/test-sessions/:testSessionId/athletes
 * Bulk import athletes into a test session
 */
export const bulkImportAthletes = async (req: Request, res: Response) => {
  try {
    const { testSessionId } = req.params;
    const { athletes } = req.body;

    // Validate test session exists
    const testSession = await TestSession.findByPk(testSessionId);
    if (!testSession) {
      return res.status(404).json({
        success: false,
        message: "Test oturumu bulunamadı",
      });
    }

    // Validate athletes array
    if (!athletes || !Array.isArray(athletes) || athletes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Sporcu listesi gerekli",
      });
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const athleteData of athletes) {
      try {
        const { fullName, birthDate, birthYear, gender } = athleteData;

        if (!fullName) {
          errors.push({ data: athleteData, error: "fullName gerekli" });
          continue;
        }

        // Calculate birthYear from birthDate if not provided
        let calculatedBirthYear = birthYear;
        let parsedBirthDate = null;

        if (birthDate) {
          parsedBirthDate = new Date(birthDate);
          if (!calculatedBirthYear) {
            calculatedBirthYear = parsedBirthDate.getFullYear();
          }
        }

        if (!calculatedBirthYear) {
          errors.push({
            data: athleteData,
            error: "birthDate veya birthYear gerekli",
          });
          continue;
        }

        // Create athlete record
        const athlete = await Athlete.create({
          full_name: fullName,
          birth_date: parsedBirthDate,
          birth_year: calculatedBirthYear,
          gender: normalizeGender(gender),
        });

        // Create AthleteTest record
        const athleteTest = await AthleteTest.create({
          test_session_id: testSessionId,
          athlete_id: athlete.id,
          status: "active",
          is_completed: false,
        });

        // Create empty Measurement record
        await Measurement.create({
          athlete_test_id: athleteTest.id,
        });

        results.push({
          athleteId: athlete.id,
          athleteTestId: athleteTest.id,
          fullName: athlete.full_name,
          birthYear: athlete.birth_year,
          gender: athlete.gender,
        });
      } catch (err) {
        errors.push({
          data: athleteData,
          error: err instanceof Error ? err.message : "Bilinmeyen hata",
        });
      }
    }

    // Update session status to in_progress if athletes added
    if (results.length > 0 && testSession.status === "draft") {
      testSession.status = "in_progress";
      await testSession.save();
    }

    return res.status(201).json({
      success: true,
      data: {
        imported: results.length,
        failed: errors.length,
        athletes: results,
        errors: errors.length > 0 ? errors : undefined,
      },
      message: `${results.length} sporcu başarıyla eklendi`,
    });
  } catch (error) {
    console.error("bulkImportAthletes error:", error);
    return res.status(500).json({
      success: false,
      message: "Sporcular eklenirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

/**
 * GET /api/test-sessions/:testSessionId/athletes
 * List athletes in a test session with their measurements
 */
export const getSessionAthletes = async (req: Request, res: Response) => {
  try {
    const { testSessionId } = req.params;

    // Validate test session exists
    const testSession = await TestSession.findByPk(testSessionId);
    if (!testSession) {
      return res.status(404).json({
        success: false,
        message: "Test oturumu bulunamadı",
      });
    }

    // Get all athlete tests for this session
    const athleteTests = await AthleteTest.findAll({
      where: { test_session_id: testSessionId },
      include: [{ association: "athlete" }, { association: "measurement" }],
      order: [["created_at", "ASC"]],
    });

    const athletes = athleteTests.map((at: any) => ({
      athleteTestId: at.id,
      athleteId: at.athlete?.id,
      fullName: at.athlete?.full_name,
      birthDate: at.athlete?.birth_date,
      birthYear: at.athlete?.birth_year,
      gender: at.athlete?.gender,
      status: at.status ?? "active",
      isCompleted: at.is_completed,
      completedAt: at.completed_at,
      measurement: at.measurement
        ? {
            id: at.measurement.id,
            height: at.measurement.height,
            weight: at.measurement.weight,
            flexibility: at.measurement.flexibility,
            sprint30m: at.measurement.sprint_30m,
            sprint30mSecond: at.measurement.sprint_30m_second,
            agility: at.measurement.agility,
            verticalJump: at.measurement.vertical_jump,
            passCount: at.measurement.pass_count,
            bmi: at.measurement.bmi,
            ffmi: at.measurement.ffmi,
            fatigueIndex: at.measurement.fatigue_index,
          }
        : null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        testSessionId,
        athletes,
        count: athletes.length,
      },
    });
  } catch (error) {
    console.error("getSessionAthletes error:", error);
    return res.status(500).json({
      success: false,
      message: "Sporcular getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

/**
 * GET /api/test-sessions/:testSessionId/field-data.xlsx
 * Export the latest central field-test data as a single workbook.
 */
export const exportSessionFieldData = async (req: Request, res: Response) => {
  try {
    const { testSessionId } = req.params;
    const testSession = await TestSession.findByPk(testSessionId);

    if (!testSession) {
      return res.status(404).json({
        success: false,
        message: "Test oturumu bulunamadı",
      });
    }

    const athleteTests = await AthleteTest.findAll({
      where: { test_session_id: testSessionId },
      include: [
        { association: "athlete" },
        { association: "measurement" },
        { association: "xOneImports" },
      ],
      order: [["created_at", "ASC"]],
    });

    const rows = athleteTests.map((athleteTest: any, index) => {
      const athlete = athleteTest.athlete;
      const measurement = athleteTest.measurement;
      const latestXOneImport = [...(athleteTest.xOneImports || [])].sort(
        (left: XOneReportImport, right: XOneReportImport) =>
          right.created_at.getTime() - left.created_at.getTime(),
      )[0];

      const height = excelNumber(measurement?.height);
      const weight = excelNumber(measurement?.weight);
      const sprintFirst = excelNumber(measurement?.sprint_30m);
      const sprintSecond = excelNumber(measurement?.sprint_30m_second);
      const bmi =
        excelNumber(measurement?.bmi) ??
        (height && weight
          ? Number((weight / Math.pow(height / 100, 2)).toFixed(2))
          : null);
      const fatigueIndex =
        excelNumber(measurement?.fatigue_index) ??
        (sprintFirst && sprintSecond
          ? Number(
              (((sprintSecond - sprintFirst) / sprintFirst) * 100).toFixed(2),
            )
          : null);

      const requiredValues: Record<string, number | null> = {
        Boy: height,
        Kilo: weight,
        Esneklik: excelNumber(measurement?.flexibility),
        "30m 1": sprintFirst,
        Çeviklik: excelNumber(measurement?.agility),
        Pas: excelNumber(measurement?.pass_count),
      };
      if (!testSession.vald_enabled) {
        requiredValues["Dikey Sıçrama"] = excelNumber(
          measurement?.vertical_jump,
        );
      }
      const missingFields = Object.entries(requiredValues)
        .filter(([, value]) => value === null)
        .map(([label]) => label);

      return {
        Sıra: index + 1,
        "Sporcu ID": athlete?.id || "",
        "Sporcu Test ID": athleteTest.id,
        "Ad Soyad": athlete?.full_name || "",
        "Doğum Tarihi": athlete?.birth_date || "",
        "Doğum Yılı": athlete?.birth_year || "",
        Cinsiyet: athlete?.gender || "",
        Durum: athleteTest.status || "active",
        "Kayıt Durumu":
          athleteTest.status === "absent"
            ? "Gelmedi"
            : missingFields.length === 0
              ? "Tamamlandı"
              : measurement
                ? "Kısmi"
                : "Boş",
        "Eksik Alanlar": missingFields.join(", "),
        "Boy (cm)": height,
        "Kilo (kg)": weight,
        VKI: bmi,
        FFMI: excelNumber(measurement?.ffmi),
        "Mineral Miktarı (kg)": excelNumber(
          latestXOneImport?.mineral_amount,
        ),
        "Vücuttaki Protein Miktarı (kg)": excelNumber(
          latestXOneImport?.protein_amount,
        ),
        "Youji Rapor URL": latestXOneImport?.qr_url || "",
        "Youji Rapor ID": latestXOneImport?.report_id || "",
        "Youji Ölçüm Tarihi": formatExcelDate(
          latestXOneImport?.measurement_time,
        ),
        "Esneklik (cm)": excelNumber(measurement?.flexibility),
        "30m 1 (sn)": sprintFirst,
        "30m 2 (sn)": sprintSecond,
        "Yorgunluk Endeksi (%)": fatigueIndex,
        "Çeviklik (sn)": excelNumber(measurement?.agility),
        "Dikey Sıçrama (cm)": excelNumber(measurement?.vertical_jump),
        "Pas (adet/30sn)": excelNumber(measurement?.pass_count),
        "Youji QR Girildi": latestXOneImport ? "Evet" : "Hayır",
        "Son Güncelleme": formatExcelDate(
          measurement?.updated_at || athleteTest.updated_at,
        ),
        "VALD Athlete ID": "",
        "VALD Test Tarihi": "",
        "VALD Veri Kaynağı": "",
        "VALD Notları": "",
      };
    });

    const workbook = XLSX.utils.book_new();
    const dataSheet = XLSX.utils.json_to_sheet(rows);
    dataSheet["!autofilter"] = {
      ref: dataSheet["!ref"] || "A1:AB1",
    };
    dataSheet["!cols"] = [
      { wch: 6 },
      { wch: 38 },
      { wch: 38 },
      { wch: 28 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 16 },
      { wch: 30 },
      { wch: 18 },
      { wch: 24 },
      { wch: 28 },
      { wch: 55 },
      { wch: 22 },
      ...Array.from({ length: 11 }, () => ({ wch: 18 })),
      { wch: 18 },
      { wch: 22 },
      { wch: 24 },
      { wch: 20 },
      { wch: 20 },
      { wch: 35 },
    ];
    XLSX.utils.book_append_sheet(workbook, dataSheet, "Saha Verileri");

    const sessionSheet = XLSX.utils.json_to_sheet([
      {
        "Oturum ID": testSession.id,
        Kulüp: testSession.club_name,
        Şehir: testSession.city,
        Spor: testSession.sport_type,
        "Test Tarihi": formatExcelDate(testSession.test_date),
        "VALD Modu": testSession.vald_enabled ? "Var" : "Yok",
        "Toplam Sporcu": athleteTests.length,
        "Dosya Oluşturma": formatExcelDate(new Date()),
      },
    ]);
    sessionSheet["!cols"] = Array.from({ length: 8 }, () => ({ wch: 24 }));
    XLSX.utils.book_append_sheet(workbook, sessionSheet, "Oturum Bilgileri");

    const instructionsSheet = XLSX.utils.aoa_to_sheet([
      ["VALD SONRASI EŞLEŞTİRME"],
      [
        "Sporcuları mümkünse Sporcu ID / Sporcu Test ID ile eşleştirin. İsim tek başına güvenli eşleştirme anahtarı değildir.",
      ],
      [
        "Yeni VALD metriklerini Saha Verileri sayfasının sağına yeni sütunlar olarak ekleyebilirsiniz.",
      ],
      [
        "Orijinal Sporcu ID ve Sporcu Test ID sütunlarını değiştirmeyin veya silmeyin.",
      ],
    ]);
    instructionsSheet["!cols"] = [{ wch: 120 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "VALD Notları");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });
    const datePart = new Date(testSession.test_date)
      .toISOString()
      .slice(0, 10);
    const fileName = `${safeFileName(testSession.club_name) || "test"}_${datePart}_saha_verileri.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("exportSessionFieldData error:", error);
    return res.status(500).json({
      success: false,
      message: "Excel saha yedeği oluşturulurken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

/**
 * POST /api/athlete-tests/:athleteTestId/measurements
 * Save or update measurements for an athlete test
 */
export const saveMeasurements = async (req: Request, res: Response) => {
  try {
    const { athleteTestId } = req.params;
    const measurementData = req.body;

    // Validate athlete test exists
    const athleteTest = await AthleteTest.findByPk(athleteTestId, {
      include: [{ association: "testSession" }],
    });
    if (!athleteTest) {
      return res.status(404).json({
        success: false,
        message: "Sporcu testi bulunamadı",
      });
    }

    // Find or create measurement
    let measurement = await Measurement.findOne({
      where: { athlete_test_id: athleteTestId },
    });

    // Map camelCase to snake_case
    const mappedData: any = {};
    if (measurementData.height !== undefined)
      mappedData.height = measurementData.height;
    if (measurementData.weight !== undefined)
      mappedData.weight = measurementData.weight;
    if (measurementData.flexibility !== undefined)
      mappedData.flexibility = measurementData.flexibility;
    if (measurementData.sprint30m !== undefined)
      mappedData.sprint_30m = measurementData.sprint30m;
    if (measurementData.sprint30mSecond !== undefined)
      mappedData.sprint_30m_second = measurementData.sprint30mSecond;
    if (measurementData.agility !== undefined)
      mappedData.agility = measurementData.agility;
    if (measurementData.verticalJump !== undefined)
      mappedData.vertical_jump = measurementData.verticalJump;
    if (measurementData.passCount !== undefined)
      mappedData.pass_count = measurementData.passCount;
    if (measurementData.bmi !== undefined) mappedData.bmi = measurementData.bmi;
    if (measurementData.ffmi !== undefined)
      mappedData.ffmi = measurementData.ffmi;
    if (measurementData.fatigueIndex !== undefined)
      mappedData.fatigue_index = measurementData.fatigueIndex;

    if (!measurement) {
      measurement = await Measurement.create({
        athlete_test_id: athleteTestId,
        ...mappedData,
      });
    } else {
      await measurement.update(mappedData);
      await measurement.reload();
    }

    // Check if all required fields are filled
    const isComplete = requiredMeasurementFields(
      Boolean((athleteTest as any).testSession?.vald_enabled),
    ).every(
      (field) => measurement![field as keyof typeof measurement] !== null,
    );

    // Auto-mark as completed if all required fields are filled
    if (isComplete && !athleteTest.is_completed) {
      athleteTest.is_completed = true;
      athleteTest.completed_at = new Date();
      await athleteTest.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        id: measurement.id,
        athleteTestId: measurement.athlete_test_id,
        height: measurement.height,
        weight: measurement.weight,
        flexibility: measurement.flexibility,
        sprint30m: measurement.sprint_30m,
        sprint30mSecond: measurement.sprint_30m_second,
        agility: measurement.agility,
        verticalJump: measurement.vertical_jump,
        passCount: measurement.pass_count,
        bmi: measurement.bmi,
        ffmi: measurement.ffmi,
        fatigueIndex: measurement.fatigue_index,
        isComplete,
      },
      message: "Ölçümler kaydedildi",
    });
  } catch (error) {
    console.error("saveMeasurements error:", error);
    return res.status(500).json({
      success: false,
      message: "Ölçümler kaydedilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

/**
 * PATCH /api/athlete-tests/:athleteTestId/status
 * Update an athlete's session status. Used for absent/skipped fallback flow.
 */
export const updateAthleteTestStatus = async (req: Request, res: Response) => {
  try {
    const { athleteTestId } = req.params;
    const { status } = req.body ?? {};
    const allowedStatuses = ["active", "absent", "skipped"] as const;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz durum. active, absent veya skipped olmalı",
        code: "INVALID_ATHLETE_TEST_STATUS",
      });
    }

    const athleteTest = await AthleteTest.findByPk(athleteTestId);
    if (!athleteTest) {
      return res.status(404).json({
        success: false,
        message: "Sporcu testi bulunamadı",
        code: "ATHLETE_TEST_NOT_FOUND",
      });
    }

    athleteTest.status = status;
    if (status === "absent" || status === "skipped") {
      athleteTest.is_completed = false;
      athleteTest.completed_at = null;
    }
    await athleteTest.save();

    return res.status(200).json({
      success: true,
      data: {
        athleteTestId: athleteTest.id,
        status: athleteTest.status,
        isCompleted: athleteTest.is_completed,
      },
      message: "Sporcu test durumu güncellendi",
    });
  } catch (error) {
    console.error("updateAthleteTestStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Sporcu test durumu güncellenirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

/**
 * POST /api/test-sessions/:testSessionId/x-one/import-qr
 * Import Youjiu X-One report by QR URL and attach it to an athlete test.
 */
export const importXOneQr = async (req: Request, res: Response) => {
  try {
    const { testSessionId } = req.params;
    const { athleteId, qrUrl } = req.body ?? {};

    if (!athleteId || typeof athleteId !== "string") {
      return res.status(400).json({
        success: false,
        message: "athleteId gerekli",
        code: "MISSING_ATHLETE_ID",
      });
    }

    if (!qrUrl || typeof qrUrl !== "string") {
      return res.status(400).json({
        success: false,
        message: "qrUrl gerekli",
        code: "MISSING_QR_URL",
      });
    }

    const testSession = await TestSession.findByPk(testSessionId);
    if (!testSession) {
      return res.status(404).json({
        success: false,
        message: "Test oturumu bulunamadı",
        code: "TEST_SESSION_NOT_FOUND",
      });
    }

    const athleteTest = await AthleteTest.findOne({
      where: {
        test_session_id: testSessionId,
        athlete_id: athleteId,
      },
      include: [{ association: "measurement" }],
    });

    if (!athleteTest) {
      return res.status(404).json({
        success: false,
        message: "Bu test oturumunda sporcu bulunamadı",
        code: "ATHLETE_TEST_NOT_FOUND",
      });
    }

    let parsedQr;
    try {
      parsedQr = parseYoujiuQrUrl(qrUrl);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Geçersiz QR URL",
        code: "INVALID_QR_URL",
      });
    }

    const existingImport = parsedQr.measurementId
      ? await XOneReportImport.findOne({
          where: { report_id: parsedQr.measurementId },
        })
      : null;

    if (
      existingImport &&
      !(
        existingImport.test_session_id === testSessionId &&
        existingImport.athlete_id === athleteId
      )
    ) {
      return res.status(409).json({
        success: false,
        message: "Bu report_id daha önce içe aktarıldı",
        code: "DUPLICATE_REPORT_ID",
        data: {
          reportId: existingImport.report_id,
          athleteId: existingImport.athlete_id,
          testSessionId: existingImport.test_session_id,
        },
      });
    }
    // TODO(production): Aynı oturum/sporcu için duplicate short-circuit'i tekrar aç.
    // Şu an testte aynı QR tekrar okutulup resmi API mi H5 fallback mi geldiği görülebilsin diye
    // aynı sporcuya ait eski kayıt varken de Youjiu yeniden sorgulanıyor.

    const client = new YoujiuApiClient();
    const reportDetail = await client.getReportDetail({
      measurementId: parsedQr.measurementId,
      reportQuery: parsedQr.reportQuery,
      token: parsedQr.token,
      agentId: parsedQr.agentId,
      h5Report: parsedQr.h5Report,
    });
    const rawPayload = reportDetail.payload;

    if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
      return res.status(502).json({
        success: false,
        message: "Youjiu API beklenen JSON nesnesini döndürmedi",
        code: "INVALID_YOUJIU_RESPONSE",
      });
    }

    const normalized = normalizeXOnePayload(rawPayload);
    const resolvedReportId =
      parsedQr.measurementId ||
      rawPayload?.result?.measurement?.id ||
      rawPayload?.result?.Composition?.meas_outline?.measurement_id ||
      rawPayload?.data?.measurement?.id ||
      rawPayload?.measurement?.id ||
      rawPayload?.id ||
      null;

    if (!resolvedReportId) {
      return res.status(502).json({
        success: false,
        message: "Youjiu yanıtında measurement id bulunamadı",
        code: "MISSING_YOUJIU_MEASUREMENT_ID",
      });
    }

    const duplicateAfterResolve = await XOneReportImport.findOne({
      where: { report_id: String(resolvedReportId) },
    });

    if (duplicateAfterResolve) {
      if (
        duplicateAfterResolve.test_session_id === testSessionId &&
        duplicateAfterResolve.athlete_id === athleteId
      ) {
        const existingMeasurement = await Measurement.findOne({
          where: { athlete_test_id: duplicateAfterResolve.athlete_test_id },
        });

        return res.status(200).json({
          success: true,
          message: "Youjiu QR raporu test için yeniden okundu",
          code: "X_ONE_IMPORT_REFRESHED_FOR_TEST",
          data: {
            testSessionId,
            athleteId,
            athleteTestId: duplicateAfterResolve.athlete_test_id,
            reportId: duplicateAfterResolve.report_id,
            agentId: duplicateAfterResolve.agent_id,
            hasQrToken: Boolean(duplicateAfterResolve.qr_token),
            importId: duplicateAfterResolve.id,
            measurementId: existingMeasurement?.id ?? null,
            importSource: reportDetail.source,
            importSourceLabel:
              reportDetail.source === "official_api"
                ? "Resmi Youjiu MCH V3 API"
                : "Youjiu H5 rapor fallback",
            officialMeasurementId: reportDetail.officialMeasurementId,
            requestedMeasurementId: reportDetail.requestedMeasurementId,
            isComplete: false,
            normalized: normalized.metrics,
            sections: {
              composition: Boolean(normalized.sections.composition),
              measurement: Boolean(normalized.sections.measurement),
              posture: Boolean(normalized.sections.posture),
              balance: Boolean(normalized.sections.balance),
            },
            deviceData: {
              rawPayload,
              result: rawPayload?.result ?? null,
              composition: normalized.sections.composition,
              measurement: normalized.sections.measurement,
              posture: normalized.sections.posture,
              balance: normalized.sections.balance,
            },
            youjiSummary: {
              deviceReportUrl: duplicateAfterResolve.qr_url,
              reportId: duplicateAfterResolve.report_id,
              measurementTime: duplicateAfterResolve.measurement_time
                ? duplicateAfterResolve.measurement_time.toISOString()
                : normalized.youjiSummary.measurementTime,
              bodyFatPercent:
                numberOrUndefined(duplicateAfterResolve.body_fat_percent) ??
                normalized.youjiSummary.bodyFatPercent,
              mineralAmount:
                numberOrUndefined(duplicateAfterResolve.mineral_amount) ??
                normalized.youjiSummary.mineralAmount,
              proteinAmount:
                numberOrUndefined(duplicateAfterResolve.protein_amount) ??
                normalized.youjiSummary.proteinAmount,
            },
            duplicate: true,
            refreshedForTest: true,
          },
        });
      }

      return res.status(409).json({
        success: false,
        message: "Bu QR kodu başka bir sporcuya atanmış",
        code: "DUPLICATE_REPORT_ID",
        data: {
          reportId: duplicateAfterResolve.report_id,
          athleteId: duplicateAfterResolve.athlete_id,
          testSessionId: duplicateAfterResolve.test_session_id,
        },
      });
    }

    const mappedMeasurementData: Record<string, number> = {};
    const measurementTime = parseDateOrNull(
      normalized.youjiSummary.measurementTime,
    );

    if (normalized.metrics.height !== null) {
      mappedMeasurementData.height = normalized.metrics.height;
    }
    if (normalized.metrics.weight !== null) {
      mappedMeasurementData.weight = normalized.metrics.weight;
    }
    if (normalized.metrics.flexibility !== null) {
      mappedMeasurementData.flexibility = normalized.metrics.flexibility;
    }
    if (normalized.metrics.sprint30m !== null) {
      mappedMeasurementData.sprint_30m = normalized.metrics.sprint30m;
    }
    if (normalized.metrics.sprint30mSecond !== null) {
      mappedMeasurementData.sprint_30m_second = normalized.metrics.sprint30mSecond;
    }
    if (normalized.metrics.agility !== null) {
      mappedMeasurementData.agility = normalized.metrics.agility;
    }
    if (normalized.metrics.verticalJump !== null) {
      mappedMeasurementData.vertical_jump = normalized.metrics.verticalJump;
    }
    if (normalized.metrics.passCount !== null) {
      mappedMeasurementData.pass_count = normalized.metrics.passCount;
    }
    if (normalized.metrics.bmi !== null) {
      mappedMeasurementData.bmi = normalized.metrics.bmi;
    }
    if (normalized.metrics.ffmi !== null) {
      mappedMeasurementData.ffmi = normalized.metrics.ffmi;
    }
    if (normalized.metrics.fatigueIndex !== null) {
      mappedMeasurementData.fatigue_index = normalized.metrics.fatigueIndex;
    }

    try {
      const result = await sequelize.transaction(async (transaction) => {
        const importedReport = await XOneReportImport.create(
          {
            test_session_id: testSessionId,
            athlete_id: athleteId,
            athlete_test_id: athleteTest.id,
            report_id: String(resolvedReportId),
            agent_id: parsedQr.agentId,
            qr_token: parsedQr.token,
            qr_url: parsedQr.qrUrl,
            raw_payload: rawPayload,
            composition: normalized.sections.composition,
            measurement: normalized.sections.measurement,
            posture: normalized.sections.posture,
            balance: normalized.sections.balance,
            measurement_time: measurementTime,
            body_fat_percent: normalized.youjiSummary.bodyFatPercent,
            mineral_amount: normalized.youjiSummary.mineralAmount,
            protein_amount: normalized.youjiSummary.proteinAmount,
            device_serial: normalized.youjiSummary.deviceSerial,
          },
          { transaction },
        );

        let measurement = (athleteTest as any).measurement as Measurement | null;
        if (!measurement) {
          measurement = await Measurement.create(
            {
              athlete_test_id: athleteTest.id,
              ...mappedMeasurementData,
            },
            { transaction },
          );
        } else if (Object.keys(mappedMeasurementData).length > 0) {
          await measurement.update(mappedMeasurementData, { transaction });
        }

        if (measurement) {
          await measurement.reload({ transaction });
        }

        const isComplete = measurement
          ? requiredMeasurementFields(testSession.vald_enabled).every(
              (field) =>
                measurement![field as keyof Measurement] !== null &&
                measurement![field as keyof Measurement] !== undefined,
            )
          : false;

        if (isComplete && !athleteTest.is_completed) {
          athleteTest.is_completed = true;
          athleteTest.completed_at = new Date();
          await athleteTest.save({ transaction });
        }

        if (testSession.status === "draft") {
          testSession.status = "in_progress";
          await testSession.save({ transaction });
        }

        return {
          importedReport,
          measurement,
          isComplete,
        };
      });

      return res.status(201).json({
        success: true,
        message: "Youjiu QR raporu başarıyla içe aktarıldı",
        data: {
          testSessionId,
          athleteId,
          athleteTestId: athleteTest.id,
          reportId: String(resolvedReportId),
          agentId: parsedQr.agentId,
          hasQrToken: Boolean(parsedQr.token),
          importId: result.importedReport.id,
          measurementId: result.measurement?.id ?? null,
          importSource: reportDetail.source,
          importSourceLabel:
            reportDetail.source === "official_api"
              ? "Resmi Youjiu MCH V3 API"
              : "Youjiu H5 rapor fallback",
          officialMeasurementId: reportDetail.officialMeasurementId,
          requestedMeasurementId: reportDetail.requestedMeasurementId,
          isComplete: result.isComplete,
          normalized: normalized.metrics,
          sections: {
            composition: Boolean(normalized.sections.composition),
            measurement: Boolean(normalized.sections.measurement),
            posture: Boolean(normalized.sections.posture),
            balance: Boolean(normalized.sections.balance),
          },
          deviceData: {
            rawPayload,
            result: rawPayload?.result ?? null,
            composition: normalized.sections.composition,
            measurement: normalized.sections.measurement,
            posture: normalized.sections.posture,
            balance: normalized.sections.balance,
          },
          youjiSummary: {
            deviceReportUrl: parsedQr.qrUrl,
            reportId: String(resolvedReportId),
            measurementTime: normalized.youjiSummary.measurementTime,
            bodyFatPercent: normalized.youjiSummary.bodyFatPercent,
            mineralAmount: normalized.youjiSummary.mineralAmount,
            proteinAmount: normalized.youjiSummary.proteinAmount,
          },
        },
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return res.status(409).json({
          success: false,
          message: "Bu QR kodu başka bir sporcuya atanmış",
          code: "DUPLICATE_REPORT_ID",
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("importXOneQr error:", error);
    const message =
      error instanceof Error ? error.message : "Bilinmeyen hata";
    const isYoujiuUpstreamError =
      message.includes("Youjiu") || message.includes("YOUJIU_");

    return res.status(isYoujiuUpstreamError ? 502 : 500).json({
      success: false,
      message: "Youjiu QR içe aktarımı sırasında hata oluştu",
      code: "X_ONE_IMPORT_FAILED",
      error: message,
      ...(isYoujiuUpstreamError ? { upstream: "youjiu" } : {}),
    });
  }
};

/**
 * GET /api/test-sessions/:id/status
 * Get test session status with athlete counts
 */
export const getSessionStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate test session exists
    const testSession = await TestSession.findByPk(id);
    if (!testSession) {
      return res.status(404).json({
        success: false,
        message: "Test oturumu bulunamadı",
      });
    }

    // Count athletes
    const totalAthletes = await AthleteTest.count({
      where: { test_session_id: id },
    });

    const completedAthletes = await AthleteTest.count({
      where: {
        test_session_id: id,
        is_completed: true,
      },
    });

    const remainingAthletes = totalAthletes - completedAthletes;

    return res.status(200).json({
      success: true,
      data: {
        id: testSession.id,
        status: testSession.status,
        clubName: testSession.club_name,
        testDate: testSession.test_date,
        totalAthletes,
        completedAthletes,
        remainingAthletes,
        progress:
          totalAthletes > 0
            ? Math.round((completedAthletes / totalAthletes) * 100)
            : 0,
      },
    });
  } catch (error) {
    console.error("getSessionStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Oturum durumu getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

/**
 * GET /api/test-sessions
 * List all test sessions
 */
export const getAllTestSessions = async (_req: Request, res: Response) => {
  try {
    const testSessions = await TestSession.findAll({
      order: [["test_date", "DESC"]],
    });

    const sessionsWithCounts = await Promise.all(
      testSessions.map(async (session) => {
        const totalAthletes = await AthleteTest.count({
          where: { test_session_id: session.id },
        });
        const completedAthletes = await AthleteTest.count({
          where: { test_session_id: session.id, is_completed: true },
        });

        return {
          id: session.id,
          clubName: session.club_name,
          clubResponsibleName: session.club_responsible_name,
          city: session.city,
          sportType: session.sport_type,
          valdEnabled: session.vald_enabled,
          valdConfig: session.vald_config,
          testDate: session.test_date,
          status: session.status,
          totalAthletes,
          completedAthletes,
          createdAt: session.created_at,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      data: sessionsWithCounts,
      count: sessionsWithCounts.length,
    });
  } catch (error) {
    console.error("getAllTestSessions error:", error);
    return res.status(500).json({
      success: false,
      message: "Test oturumları getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

/**
 * GET /api/test-sessions/:id
 * Get test session by ID
 */
export const getTestSessionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const testSession = await TestSession.findByPk(id);
    if (!testSession) {
      return res.status(404).json({
        success: false,
        message: "Test oturumu bulunamadı",
      });
    }

    // Get counts
    const totalAthletes = await AthleteTest.count({
      where: { test_session_id: id },
    });
    const completedAthletes = await AthleteTest.count({
      where: { test_session_id: id, is_completed: true },
    });

    return res.status(200).json({
      success: true,
      data: {
        id: testSession.id,
        clubName: testSession.club_name,
        clubResponsibleName: testSession.club_responsible_name,
        clubResponsibleEmail: testSession.club_responsible_email,
        clubResponsiblePhone: testSession.club_responsible_phone,
        city: testSession.city,
        sportType: testSession.sport_type,
        valdEnabled: testSession.vald_enabled,
        valdConfig: testSession.vald_config,
        testDate: testSession.test_date,
        status: testSession.status,
        notes: testSession.notes,
        totalAthletes,
        completedAthletes,
        createdAt: testSession.created_at,
        updatedAt: testSession.updated_at,
      },
    });
  } catch (error) {
    console.error("getTestSessionById error:", error);
    return res.status(500).json({
      success: false,
      message: "Test oturumu getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};
