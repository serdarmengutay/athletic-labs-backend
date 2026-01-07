import { Request, Response } from "express";
import {
  Athlete,
  TestSession,
  Station,
  StationTestResult,
  Coach,
  TestResult,
  PercentileResult,
} from "../models";
import {
  calculateAgeGroupPercentile,
  calculateMetricScore,
  getAgeGroup,
  calculateBMI,
  calculateFFMI,
  calculateFatigueIndex,
} from "../utils/calculations";

// QR kod ile sporcu bilgilerini getir
export const getAthleteByQR = async (req: Request, res: Response) => {
  try {
    const { qrData } = req.body;

    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz QR kod formatı",
      });
    }

    const { athleteId, sessionId } = parsedData;

    const athlete = await Athlete.findOne({
      where: { id: athleteId },
      include: [{ model: TestSession, as: "testSessions" }],
    });

    const session = await TestSession.findOne({ where: { id: sessionId } });

    if (!athlete) {
      return res.status(404).json({
        success: false,
        message: "Sporcu bulunamadı",
      });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Test oturumu bulunamadı",
      });
    }

    if (session.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Test oturumu aktif değil",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        athlete: {
          id: athlete.id,
          athlete_code: athlete.athlete_code,
          name: `${athlete.first_name} ${athlete.last_name}`,
          birth_year: athlete.birth_year,
          height: athlete.height,
          weight: athlete.weight,
          bmi: athlete.bmi,
          ffmi: athlete.ffmi,
        },
        session: {
          id: session.id,
          test_date: session.test_date,
          status: session.status,
        },
      },
      message: "Sporcu bilgileri başarıyla getirildi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Sporcu bilgileri getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// İstasyon verilerini kaydet
export const saveStationData = async (req: Request, res: Response) => {
  try {
    const { athleteId, sessionId, stationId, metric, value, coachId } =
      req.body;

    // Sporcu ve oturum kontrolü
    const athlete = await Athlete.findOne({ where: { id: athleteId } });
    const session = await TestSession.findOne({ where: { id: sessionId } });
    const station = await Station.findOne({ where: { id: stationId } });
    const coach = await Coach.findOne({ where: { id: coachId } });

    if (!athlete || !session || !station || !coach) {
      return res.status(404).json({
        success: false,
        message: "Gerekli kayıtlar bulunamadı",
      });
    }

    if (session.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Test oturumu aktif değil",
      });
    }

    // İstasyon test sonucunu kaydet
    const stationTestResult = await StationTestResult.create({
      test_session_id: sessionId,
      athlete_id: athleteId,
      station_id: stationId,
      metric,
      value,
      coach_id: coachId,
      status: "completed",
      completed_at: new Date(),
    });

    // Eğer tüm metrikler tamamlandıysa, genel test sonucunu oluştur
    await checkAndCreateTestResult(athleteId, sessionId);

    return res.status(200).json({
      success: true,
      data: stationTestResult,
      message: "İstasyon verisi başarıyla kaydedildi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "İstasyon verisi kaydedilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// Tüm istasyonları getir
export const getStations = async (req: Request, res: Response) => {
  try {
    const stations = await Station.findAll({
      order: [["name", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      data: stations,
      message: "İstasyonlar başarıyla getirildi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "İstasyonlar getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// İstasyon oluştur
export const createStation = async (req: Request, res: Response) => {
  try {
    const { name, description, metrics } = req.body;

    const station = await Station.create({
      name,
      description,
      metrics,
    });

    return res.status(201).json({
      success: true,
      data: station,
      message: "İstasyon başarıyla oluşturuldu",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "İstasyon oluşturulurken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// Sporcu test durumunu getir
export const getAthleteTestStatus = async (req: Request, res: Response) => {
  try {
    const { athleteId, sessionId } = req.params;

    const stationTestResults = await StationTestResult.findAll({
      where: {
        athlete_id: athleteId,
        test_session_id: sessionId,
      },
      include: [
        { model: Station, as: "station" },
        { model: Coach, as: "coach" },
      ],
    });

    const stations = await Station.findAll();
    const status = stations.map((station) => {
      const stationResults = stationTestResults.filter(
        (result) => result.station_id === station.id
      );

      return {
        station: station,
        completed_metrics: stationResults.map((r) => r.metric),
        missing_metrics: station.metrics.filter(
          (metric) => !stationResults.some((r) => r.metric === metric)
        ),
        is_completed: stationResults.length === station.metrics.length,
        results: stationResults,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        athlete_id: athleteId,
        session_id: sessionId,
        stations: status,
        overall_completion: status.every((s) => s.is_completed),
      },
      message: "Sporcu test durumu başarıyla getirildi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Sporcu test durumu getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// Yardımcı fonksiyon: Tüm metrikler tamamlandıysa test sonucunu oluştur
const checkAndCreateTestResult = async (
  athleteId: string,
  sessionId: string
) => {
  try {
    const athlete = await Athlete.findOne({ where: { id: athleteId } });
    if (!athlete) return;

    const stationTestResults = await StationTestResult.findAll({
      where: {
        athlete_id: athleteId,
        test_session_id: sessionId,
        status: "completed",
      },
    });

    // Tüm gerekli metriklerin tamamlanıp tamamlanmadığını kontrol et
    const requiredMetrics = [
      "height",
      "weight",
      "flexibility",
      "sprint_30m_first",
      "sprint_30m_second",
      "agility",
      "vertical_jump",
    ];

    const completedMetrics = stationTestResults.map((r) => r.metric);
    const allCompleted = requiredMetrics.every((metric) =>
      completedMetrics.includes(metric)
    );

    if (allCompleted) {
      // Test sonucunu oluştur
      const testResult = await createTestResultFromStationData(
        athleteId,
        sessionId,
        stationTestResults
      );

      // Percentile hesaplamalarını yap
      await calculateAndSavePercentiles(testResult.id, athleteId);
    }
  } catch (error) {
    console.error("Test sonucu oluşturulurken hata:", error);
  }
};

// Yardımcı fonksiyon: İstasyon verilerinden test sonucu oluştur
const createTestResultFromStationData = async (
  athleteId: string,
  sessionId: string,
  stationResults: any[]
) => {
  const athlete = await Athlete.findOne({ where: { id: athleteId } });
  if (!athlete) throw new Error("Sporcu bulunamadı");

  // Metrikleri topla
  const metrics: any = {};
  stationResults.forEach((result) => {
    metrics[result.metric] = result.value;
  });

  // BMI ve FFMI hesapla
  const bmi = calculateBMI(athlete.height, athlete.weight);
  const ffmi = calculateFFMI(athlete.height, athlete.weight, 15); // Varsayılan %15 vücut yağı

  // Yorgunluk endeksi hesapla
  const fatigueIndex = calculateFatigueIndex(
    metrics.sprint_30m_first || 0,
    metrics.sprint_30m_second || 0
  );

  // Test sonucunu oluştur
  const testResult = await TestResult.create({
    athlete_id: athleteId,
    test_session_id: sessionId,
    flexibility: metrics.flexibility || 0,
    sprint_30m_first: metrics.sprint_30m_first || 0,
    sprint_30m_second: metrics.sprint_30m_second || 0,
    fatigue_index: fatigueIndex,
    agility: metrics.agility || 0,
    vertical_jump: metrics.vertical_jump || 0,
    ffmi: ffmi,
  });

  // Sporcu bilgilerini güncelle
  await athlete.update({
    height: metrics.height || athlete.height,
    weight: metrics.weight || athlete.weight,
    bmi: bmi,
    ffmi: ffmi,
  });

  return testResult;
};

// Yardımcı fonksiyon: Percentile hesaplamalarını yap ve kaydet
const calculateAndSavePercentiles = async (
  testResultId: string,
  athleteId: string
) => {
  try {
    const athlete = await Athlete.findOne({ where: { id: athleteId } });
    const testResult = await TestResult.findOne({
      where: { id: testResultId },
    });

    if (!athlete || !testResult) return;

    const ageGroup = getAgeGroup(athlete.birth_year);

    // Aynı yaş grubundaki tüm test sonuçlarını getir
    const allAthletes = await Athlete.findAll({
      where: {
        birth_year: athlete.birth_year,
      },
    });

    const allTestResults = await TestResult.findAll({
      where: {
        athlete_id: allAthletes.map((a) => a.id),
      },
    });

    // Her metrik için percentile hesapla
    const percentiles = {
      height_percentile: calculateAgeGroupPercentile(
        athlete.height,
        ageGroup,
        "height",
        allAthletes.map((a) => ({
          ageGroup,
          metric: "height",
          value: a.height,
        }))
      ),
      weight_percentile: calculateAgeGroupPercentile(
        athlete.weight,
        ageGroup,
        "weight",
        allAthletes.map((a) => ({
          ageGroup,
          metric: "weight",
          value: a.weight,
        }))
      ),
      bmi_percentile: calculateAgeGroupPercentile(
        athlete.bmi,
        ageGroup,
        "bmi",
        allAthletes.map((a) => ({ ageGroup, metric: "bmi", value: a.bmi }))
      ),
      ffmi_percentile: calculateAgeGroupPercentile(
        athlete.ffmi,
        ageGroup,
        "ffmi",
        allAthletes.map((a) => ({ ageGroup, metric: "ffmi", value: a.ffmi }))
      ),
      flexibility_percentile: calculateAgeGroupPercentile(
        testResult.flexibility,
        ageGroup,
        "flexibility",
        allTestResults.map((r: any) => ({
          ageGroup,
          metric: "flexibility",
          value: r.flexibility,
        }))
      ),
      sprint_30m_first_percentile: calculateAgeGroupPercentile(
        testResult.sprint_30m_first,
        ageGroup,
        "sprint_30m_first",
        allTestResults.map((r: any) => ({
          ageGroup,
          metric: "sprint_30m_first",
          value: r.sprint_30m_first,
        }))
      ),
      sprint_30m_second_percentile: calculateAgeGroupPercentile(
        testResult.sprint_30m_second,
        ageGroup,
        "sprint_30m_second",
        allTestResults.map((r: any) => ({
          ageGroup,
          metric: "sprint_30m_second",
          value: r.sprint_30m_second,
        }))
      ),
      fatigue_index_percentile: calculateAgeGroupPercentile(
        testResult.fatigue_index,
        ageGroup,
        "fatigue_index",
        allTestResults.map((r: any) => ({
          ageGroup,
          metric: "fatigue_index",
          value: r.fatigue_index,
        }))
      ),
      agility_percentile: calculateAgeGroupPercentile(
        testResult.agility,
        ageGroup,
        "agility",
        allTestResults.map((r: any) => ({
          ageGroup,
          metric: "agility",
          value: r.agility,
        }))
      ),
      vertical_jump_percentile: calculateAgeGroupPercentile(
        testResult.vertical_jump,
        ageGroup,
        "vertical_jump",
        allTestResults.map((r: any) => ({
          ageGroup,
          metric: "vertical_jump",
          value: r.vertical_jump,
        }))
      ),
    };

    // Skorları hesapla
    const scores = {
      height_score: calculateMetricScore(percentiles.height_percentile),
      weight_score: calculateMetricScore(percentiles.weight_percentile),
      bmi_score: calculateMetricScore(percentiles.bmi_percentile),
      ffmi_score: calculateMetricScore(percentiles.ffmi_percentile),
      flexibility_score: calculateMetricScore(
        percentiles.flexibility_percentile
      ),
      sprint_30m_first_score: calculateMetricScore(
        percentiles.sprint_30m_first_percentile
      ),
      sprint_30m_second_score: calculateMetricScore(
        percentiles.sprint_30m_second_percentile
      ),
      fatigue_index_score: calculateMetricScore(
        percentiles.fatigue_index_percentile
      ),
      agility_score: calculateMetricScore(percentiles.agility_percentile),
      vertical_jump_score: calculateMetricScore(
        percentiles.vertical_jump_percentile
      ),
    };

    // Genel percentile ve skor hesapla
    const allPercentiles = Object.values(percentiles);
    const overallPercentile =
      allPercentiles.reduce((sum, p) => sum + p, 0) / allPercentiles.length;
    const overallScore = calculateMetricScore(overallPercentile);

    // PercentileResult kaydet
    await PercentileResult.create({
      athlete_id: athleteId,
      test_result_id: testResultId,
      age_group: ageGroup,
      ...percentiles,
      ...scores,
      overall_percentile: overallPercentile,
    });
  } catch (error) {
    console.error("Percentile hesaplamalarında hata:", error);
  }
};

// Test verisi gönder
export const submitTestData = async (req: Request, res: Response) => {
  try {
    const { athlete_id, station_id, values, session_id, notes } = req.body;

    if (!athlete_id || !station_id || !values || !session_id) {
      return res.status(400).json({
        success: false,
        message: "Sporcu ID, istasyon ID, değerler ve oturum ID gerekli",
      });
    }

    // Sporcu ve oturum kontrolü
    const athlete = await Athlete.findOne({ where: { id: athlete_id } });
    const session = await TestSession.findOne({ where: { id: session_id } });
    const station = await Station.findOne({ where: { id: station_id } });

    if (!athlete) {
      return res.status(404).json({
        success: false,
        message: "Sporcu bulunamadı",
      });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Test oturumu bulunamadı",
      });
    }

    if (!station) {
      return res.status(404).json({
        success: false,
        message: "İstasyon bulunamadı",
      });
    }

    // Test verilerini kaydet - her metrik için ayrı kayıt oluştur
    const testResults = [];
    for (const [metric, value] of Object.entries(values)) {
      const testResult = await StationTestResult.create({
        athlete_id,
        station_id,
        test_session_id: session_id,
        metric,
        value: Number(value),
        coach_id: (req as any).coach?.id || "system", // Antrenör ID'si
        status: "completed",
        completed_at: new Date(),
        notes: notes || null,
      });
      testResults.push(testResult);
    }

    return res.status(200).json({
      success: true,
      data: testResults,
      message: "Test verisi başarıyla kaydedildi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Test verisi kaydedilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// İstasyon sırasını getir
export const getStationQueue = async (req: Request, res: Response) => {
  try {
    const { station_id, session_id } = req.query;

    if (!station_id || !session_id) {
      return res.status(400).json({
        success: false,
        message: "İstasyon ID ve oturum ID gerekli",
      });
    }

    // Query parametrelerini string'e çevir
    const stationId = String(station_id);
    const sessionId = String(session_id);

    // İstasyon sırasını getir (henüz test edilmemiş sporcular)
    const athletes = await Athlete.findAll({
      include: [
        {
          model: TestSession,
          as: "testSessions",
          where: { id: sessionId },
        },
      ],
    });

    // Test edilmemiş sporcuları filtrele
    const untestedAthletes = [];
    for (const athlete of athletes) {
      const existingResult = await StationTestResult.findOne({
        where: {
          athlete_id: athlete.id,
          station_id: stationId,
          test_session_id: sessionId,
        },
      });

      if (!existingResult) {
        untestedAthletes.push(athlete);
      }
    }

    return res.status(200).json({
      success: true,
      data: untestedAthletes,
      count: untestedAthletes.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "İstasyon sırası getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// Sporcu sıraya ekle
export const addToQueue = async (req: Request, res: Response) => {
  try {
    const { athlete_id, station_id, session_id } = req.body;

    if (!athlete_id || !station_id || !session_id) {
      return res.status(400).json({
        success: false,
        message: "Sporcu ID, istasyon ID ve oturum ID gerekli",
      });
    }

    // Sporcu zaten sırada mı kontrol et
    const existingResult = await StationTestResult.findOne({
      where: {
        athlete_id,
        station_id,
        test_session_id: session_id,
      },
    });

    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: "Sporcu zaten bu istasyonda test edilmiş",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Sporcu sıraya eklendi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Sporcu sıraya eklenirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// Oturum durumunu getir
export const getSessionStatus = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = await TestSession.findOne({ where: { id: sessionId } });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Test oturumu bulunamadı",
      });
    }

    // Oturum istatistikleri
    const totalAthletes = await Athlete.count({
      include: [
        {
          model: TestSession,
          as: "testSessions",
          where: { id: sessionId },
        },
      ],
    });

    const completedTests = await StationTestResult.count({
      where: { test_session_id: sessionId },
    });

    return res.status(200).json({
      success: true,
      data: {
        session: {
          id: session.id,
          test_date: session.test_date,
          status: session.status,
          notes: session.notes,
        },
        statistics: {
          total_athletes: totalAthletes,
          completed_tests: completedTests,
          progress_percentage:
            totalAthletes > 0 ? (completedTests / totalAthletes) * 100 : 0,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Oturum durumu getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// İstasyon verilerini getir
export const getStationData = async (req: Request, res: Response) => {
  try {
    const { stationId } = req.params;

    const station = await Station.findOne({ where: { id: stationId } });

    if (!station) {
      return res.status(404).json({
        success: false,
        message: "İstasyon bulunamadı",
      });
    }

    return res.status(200).json({
      success: true,
      data: station,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "İstasyon verileri getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// Sporcu verilerini getir
export const getAthleteData = async (req: Request, res: Response) => {
  try {
    const { athleteId, stationId } = req.params;

    const athlete = await Athlete.findOne({ where: { id: athleteId } });
    const station = await Station.findOne({ where: { id: stationId } });

    if (!athlete) {
      return res.status(404).json({
        success: false,
        message: "Sporcu bulunamadı",
      });
    }

    if (!station) {
      return res.status(404).json({
        success: false,
        message: "İstasyon bulunamadı",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        athlete: {
          id: athlete.id,
          athlete_code: athlete.athlete_code,
          name: `${athlete.first_name} ${athlete.last_name}`,
          birth_year: athlete.birth_year,
          height: athlete.height,
          weight: athlete.weight,
        },
        station: station,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Sporcu verileri getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// Aktif oturumu getir
export const getActiveSession = async (req: Request, res: Response) => {
  try {
    const { stationId } = req.params;

    const station = await Station.findOne({ where: { id: stationId } });

    if (!station) {
      return res.status(404).json({
        success: false,
        message: "İstasyon bulunamadı",
      });
    }

    // Aktif test oturumunu bul
    const activeSession = await TestSession.findOne({
      where: { status: "active" },
      order: [["created_at", "DESC"]],
    });

    if (!activeSession) {
      return res.status(404).json({
        success: false,
        message: "Aktif test oturumu bulunamadı",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        session: {
          id: activeSession.id,
          test_date: activeSession.test_date,
          status: activeSession.status,
          notes: activeSession.notes,
        },
        station: station,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Aktif oturum getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};
