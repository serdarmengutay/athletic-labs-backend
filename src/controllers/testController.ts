// TODO MVP: Test controller simplified for MVP
// Using new TestSession with inline club info
import { Request, Response } from "express";
import { TestSession, Athlete, AthleteTest, Measurement } from "../models";

export const createTestSession = async (req: Request, res: Response) => {
  try {
    const {
      club_name,
      club_responsible_name,
      club_responsible_email,
      club_responsible_phone,
      city,
      sport_type,
      vald_enabled = false,
      vald_config,
      test_date,
      notes,
    } = req.body;

    if (
      !club_name ||
      !club_responsible_name ||
      !city ||
      !sport_type ||
      !test_date
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Kulüp adı, sorumlu adı, şehir, spor tipi ve test tarihi gerekli",
      });
    }

    const testSession = await TestSession.create({
      club_name,
      club_responsible_name,
      club_responsible_email,
      club_responsible_phone,
      city,
      sport_type,
      vald_enabled: Boolean(vald_enabled),
      vald_config:
        vald_config && typeof vald_config === "object"
          ? vald_config
          : {
              schemaVersion: 1,
              disabledManualFields: [],
              expectedMetrics: [],
            },
      test_date: new Date(test_date),
      notes,
    });

    return res.status(201).json({
      success: true,
      data: testSession,
      message: "Test oturumu başarıyla oluşturuldu",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Test oturumu oluşturulurken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const getAllTestSessions = async (_req: Request, res: Response) => {
  try {
    const testSessions = await TestSession.findAll({
      include: [
        {
          association: "athleteTests",
          include: [{ association: "athlete" }, { association: "measurement" }],
        },
      ],
      order: [["test_date", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: testSessions,
      count: testSessions.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Test oturumları getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const getTestSessionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const testSession = await TestSession.findOne({
      where: { id },
      include: [
        {
          association: "athleteTests",
          include: [{ association: "athlete" }, { association: "measurement" }],
        },
      ],
    });

    if (!testSession) {
      return res.status(404).json({
        success: false,
        message: "Test oturumu bulunamadı",
      });
    }

    return res.status(200).json({
      success: true,
      data: testSession,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Test oturumu getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const updateTestSessionStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const testSession = await TestSession.findOne({ where: { id } });

    if (!testSession) {
      return res.status(404).json({
        success: false,
        message: "Test oturumu bulunamadı",
      });
    }

    if (!["draft", "in_progress", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz durum değeri",
      });
    }

    testSession.status = status;
    await testSession.save();

    return res.status(200).json({
      success: true,
      data: testSession,
      message: "Test oturumu durumu güncellendi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Test oturumu güncellenirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const addAthleteToSession = async (req: Request, res: Response) => {
  try {
    const { test_session_id, athlete_id } = req.body;

    const testSession = await TestSession.findOne({
      where: { id: test_session_id },
    });
    const athlete = await Athlete.findOne({ where: { id: athlete_id } });

    if (!testSession) {
      return res.status(404).json({
        success: false,
        message: "Test oturumu bulunamadı",
      });
    }

    if (!athlete) {
      return res.status(404).json({
        success: false,
        message: "Sporcu bulunamadı",
      });
    }

    // Check if athlete already in session
    const existingAthleteTest = await AthleteTest.findOne({
      where: { test_session_id, athlete_id },
    });

    if (existingAthleteTest) {
      return res.status(400).json({
        success: false,
        message: "Sporcu zaten bu oturumda",
      });
    }

    const athleteTest = await AthleteTest.create({
      test_session_id,
      athlete_id,
    });

    // Create empty measurement
    await Measurement.create({
      athlete_test_id: athleteTest.id,
    });

    return res.status(201).json({
      success: true,
      data: athleteTest,
      message: "Sporcu oturuma eklendi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Sporcu oturuma eklenirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const saveMeasurement = async (req: Request, res: Response) => {
  try {
    const { athlete_test_id, ...measurementData } = req.body;

    const athleteTest = await AthleteTest.findOne({
      where: { id: athlete_test_id },
      include: [{ association: "measurement" }],
    });

    if (!athleteTest) {
      return res.status(404).json({
        success: false,
        message: "Sporcu testi bulunamadı",
      });
    }

    // Find or create measurement
    let measurement = await Measurement.findOne({
      where: { athlete_test_id },
    });

    if (!measurement) {
      measurement = await Measurement.create({
        athlete_test_id,
        ...measurementData,
      });
    } else {
      // Update existing measurement
      await measurement.update(measurementData);
    }

    return res.status(200).json({
      success: true,
      data: measurement,
      message: "Ölçüm kaydedildi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Ölçüm kaydedilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const completeAthleteTest = async (req: Request, res: Response) => {
  try {
    const { athlete_test_id } = req.body;

    const athleteTest = await AthleteTest.findOne({
      where: { id: athlete_test_id },
    });

    if (!athleteTest) {
      return res.status(404).json({
        success: false,
        message: "Sporcu testi bulunamadı",
      });
    }

    athleteTest.is_completed = true;
    athleteTest.completed_at = new Date();
    await athleteTest.save();

    return res.status(200).json({
      success: true,
      data: athleteTest,
      message: "Sporcu testi tamamlandı",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Sporcu testi tamamlanırken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// TODO MVP: Legacy endpoints disabled
export const addTestResult = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message:
      "Legacy addTestResult is disabled for MVP. Use saveMeasurement instead.",
  });
};

export const getAthleteTestHistory = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Legacy getAthleteTestHistory is disabled for MVP",
  });
};

export const getClubTestSessions = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Legacy getClubTestSessions is disabled for MVP",
  });
};
