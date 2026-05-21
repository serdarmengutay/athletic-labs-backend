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

    // 3. Generate reports for each athlete
    const athletes: FrontendAthleteReport[] = [];
    const warnings: { athleteId: string; fullName: string; warning: string }[] =
      [];

    for (const athleteTest of athleteTests) {
      const measurement = (athleteTest as any).measurement;
      const athlete = (athleteTest as any).athlete;

      try {
        // generateFrontendAthleteReport handles missing measurements and benchmark data gracefully
        const report = await generateFrontendAthleteReport(
          athleteTest,
          measurement,
        );
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
 * POST /api/athlete-tests/:athleteTestId/measurements
 * Save or update measurements for an athlete test
 */
export const saveMeasurements = async (req: Request, res: Response) => {
  try {
    const { athleteTestId } = req.params;
    const measurementData = req.body;

    // Validate athlete test exists
    const athleteTest = await AthleteTest.findByPk(athleteTestId);
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
    const isComplete = REQUIRED_MEASUREMENT_FIELDS.every(
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

    if (existingImport) {
      if (
        existingImport.test_session_id === testSessionId &&
        existingImport.athlete_id === athleteId
      ) {
        const existingMeasurement = await Measurement.findOne({
          where: { athlete_test_id: existingImport.athlete_test_id },
        });
        const normalized = normalizeXOnePayload(existingImport.raw_payload);

        return res.status(200).json({
          success: true,
          message: "Youjiu QR raporu daha önce içe aktarılmış",
          code: "X_ONE_IMPORT_ALREADY_EXISTS",
          data: {
            testSessionId,
            athleteId,
            athleteTestId: existingImport.athlete_test_id,
            reportId: existingImport.report_id,
            agentId: existingImport.agent_id,
            hasQrToken: Boolean(existingImport.qr_token),
            importId: existingImport.id,
            measurementId: existingMeasurement?.id ?? null,
            isComplete: false,
            normalized: normalized.metrics,
            sections: {
              composition: Boolean(normalized.sections.composition),
              measurement: Boolean(normalized.sections.measurement),
              posture: Boolean(normalized.sections.posture),
              balance: Boolean(normalized.sections.balance),
            },
            deviceData: {
              rawPayload: existingImport.raw_payload,
              result: existingImport.raw_payload?.result ?? null,
              composition: normalized.sections.composition,
              measurement: normalized.sections.measurement,
              posture: normalized.sections.posture,
              balance: normalized.sections.balance,
            },
            duplicate: true,
          },
        });
      }

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

    const client = new YoujiuApiClient();
    const rawPayload = await client.getReportDetail({
      measurementId: parsedQr.measurementId,
      reportQuery: parsedQr.reportQuery,
      token: parsedQr.token,
      agentId: parsedQr.agentId,
      h5Report: parsedQr.h5Report,
    });

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
        const existingNormalized = normalizeXOnePayload(duplicateAfterResolve.raw_payload);

        return res.status(200).json({
          success: true,
          message: "Youjiu QR raporu daha önce içe aktarılmış",
          code: "X_ONE_IMPORT_ALREADY_EXISTS",
          data: {
            testSessionId,
            athleteId,
            athleteTestId: duplicateAfterResolve.athlete_test_id,
            reportId: duplicateAfterResolve.report_id,
            agentId: duplicateAfterResolve.agent_id,
            hasQrToken: Boolean(duplicateAfterResolve.qr_token),
            importId: duplicateAfterResolve.id,
            measurementId: existingMeasurement?.id ?? null,
            isComplete: false,
            normalized: existingNormalized.metrics,
            sections: {
              composition: Boolean(existingNormalized.sections.composition),
              measurement: Boolean(existingNormalized.sections.measurement),
              posture: Boolean(existingNormalized.sections.posture),
              balance: Boolean(existingNormalized.sections.balance),
            },
            deviceData: {
              rawPayload: duplicateAfterResolve.raw_payload,
              result: duplicateAfterResolve.raw_payload?.result ?? null,
              composition: existingNormalized.sections.composition,
              measurement: existingNormalized.sections.measurement,
              posture: existingNormalized.sections.posture,
              balance: existingNormalized.sections.balance,
            },
            duplicate: true,
          },
        });
      }

      return res.status(409).json({
        success: false,
        message: "Bu measurement id daha önce içe aktarıldı",
        code: "DUPLICATE_REPORT_ID",
        data: {
          reportId: duplicateAfterResolve.report_id,
          athleteId: duplicateAfterResolve.athlete_id,
          testSessionId: duplicateAfterResolve.test_session_id,
        },
      });
    }

    const mappedMeasurementData: Record<string, number> = {};

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
          ? REQUIRED_MEASUREMENT_FIELDS.every(
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
        },
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return res.status(409).json({
          success: false,
          message: "Bu report_id daha önce içe aktarıldı",
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
