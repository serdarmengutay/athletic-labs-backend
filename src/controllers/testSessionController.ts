// MVP Test Sessions Controller
import { Request, Response } from "express";
import { TestSession, Athlete, AthleteTest, Measurement } from "../models";
import { Op } from "sequelize";
import {
  generateAthleteReport,
  AthleteReport,
  NoBenchmarkDataError,
} from "../services/calculationService";

// Required measurement fields for marking test as complete
const REQUIRED_MEASUREMENT_FIELDS = [
  "height",
  "weight",
  "flexibility",
  "sprint_30m",
  "agility",
  "vertical_jump",
];

/**
 * POST /api/test-sessions/:id/calculate-report
 * Calculate performance report for all athletes in a test session
 */
export const calculateReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const testSession = await TestSession.findByPk(id);

    if (!testSession) {
      return res.status(404).json({
        success: false,
        message: "Test oturumu bulunamadı",
      });
    }

    const athleteTests = await AthleteTest.findAll({
      where: { test_session_id: id },
      include: [{ association: "athlete" }, { association: "measurement" }],
    });

    if (athleteTests.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Bu oturumda sporcu bulunmuyor",
      });
    }

    const allCompleted = athleteTests.every((at: any) => at.is_completed);
    if (!allCompleted) {
      const completedCount = athleteTests.filter(
        (at: any) => at.is_completed
      ).length;
      return res.status(400).json({
        success: false,
        message: `Tüm sporcuların testleri tamamlanmalı (${completedCount}/${athleteTests.length})`,
      });
    }

    const reports: AthleteReport[] = [];
    const errors: { athleteId: string; fullName: string; error: string }[] = [];

    for (const athleteTest of athleteTests) {
      const measurement = (athleteTest as any).measurement;
      const athlete = (athleteTest as any).athlete;

      if (!measurement) {
        errors.push({
          athleteId: athlete?.id,
          fullName: athlete?.full_name || "Unknown",
          error: "Ölçüm verisi bulunamadı",
        });
        continue;
      }

      try {
        const report = await generateAthleteReport(athleteTest, measurement);
        reports.push(report);
      } catch (err) {
        if (err instanceof NoBenchmarkDataError) {
          errors.push({
            athleteId: athlete?.id,
            fullName: athlete?.full_name || "Unknown",
            error: err.message,
          });
        } else {
          errors.push({
            athleteId: athlete?.id,
            fullName: athlete?.full_name || "Unknown",
            error: err instanceof Error ? err.message : "Bilinmeyen hata",
          });
        }
      }
    }

    // If all athletes failed due to no benchmark data, return 400
    if (reports.length === 0 && errors.length > 0) {
      const benchmarkErrors = errors.filter((e) =>
        e.error.includes("benchmark")
      );
      if (benchmarkErrors.length === errors.length) {
        return res.status(400).json({
          success: false,
          message: "No benchmark data for this age group",
          errors,
        });
      }
    }

    if (
      reports.length === athleteTests.length &&
      testSession.status !== "completed"
    ) {
      testSession.status = "completed";
      await testSession.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        testSessionId: id,
        clubName: testSession.club_name,
        testDate: testSession.test_date,
        totalAthletes: athleteTests.length,
        reportsGenerated: reports.length,
        reports,
        errors: errors.length > 0 ? errors : undefined,
      },
      message: `${reports.length} sporcu için rapor oluşturuldu`,
    });
  } catch (error) {
    console.error("calculateReport error:", error);
    return res.status(500).json({
      success: false,
      message: "Rapor oluşturulurken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
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
        const { fullName, birthDate, birthYear } = athleteData;

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
        });

        // Create AthleteTest record
        const athleteTest = await AthleteTest.create({
          test_session_id: testSessionId,
          athlete_id: athlete.id,
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
      (field) => measurement![field as keyof typeof measurement] !== null
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
      })
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
