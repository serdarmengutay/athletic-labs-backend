import { Request, Response } from "express";
import { TestSession, TestResult, PercentileResult, Athlete } from "../models";
import {
  calculateFatigueIndex,
  calculatePercentile,
  calculateScore,
  calculateOverallScore,
  getAgeGroup,
  getBirthYear,
} from "../utils/calculations";

export const createTestSession = async (req: Request, res: Response) => {
  try {
    const { club_id, test_date, notes } = req.body;

    const testSession = await TestSession.create({
      club_id,
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

export const addTestResult = async (req: Request, res: Response) => {
  try {
    const {
      athlete_id,
      test_session_id,
      flexibility,
      sprint_30m_first,
      sprint_30m_second,
      agility,
      vertical_jump,
      ffmi,
    } = req.body;

    console.log("Test result request body:", req.body);

    // Sporcu bilgilerini al (önce athlete'ı bulalım)
    console.log("Aranan athlete_id:", athlete_id);
    const athlete = await Athlete.findOne({
      where: { id: athlete_id },
    });
    console.log("Bulunan athlete:", athlete);
    if (!athlete) {
      return res.status(404).json({
        success: false,
        message: "Sporcu bulunamadı",
      });
    }

    // Yorgunluk endeksi hesapla
    const fatigue_index = calculateFatigueIndex(
      sprint_30m_first,
      sprint_30m_second
    );

    // Test sonucunu kaydet
    const testResult = await TestResult.create({
      athlete_id,
      test_session_id,
      flexibility,
      sprint_30m_first,
      sprint_30m_second,
      fatigue_index,
      agility,
      vertical_jump,
      ffmi,
    });

    // Aynı doğum yılındaki tüm sporcuları al
    const birthYear = getBirthYear(athlete.birth_year);
    const ageGroupAthletes = await Athlete.findAll({
      where: {
        birth_year: birthYear,
      },
      include: ["testResults"],
    });

    // Yüzdelik dilimleri hesapla
    const percentiles = await calculatePercentiles(
      testResult,
      athlete,
      ageGroupAthletes
    );

    // Yüzdelik sonuçlarını kaydet
    const percentileResult = await PercentileResult.create({
      athlete_id,
      test_result_id: testResult.id,
      age_group: getAgeGroup(athlete.birth_year),
      height_percentile: percentiles.height_percentile,
      weight_percentile: percentiles.weight_percentile,
      bmi_percentile: percentiles.bmi_percentile,
      ffmi_percentile: percentiles.ffmi_percentile,
      flexibility_percentile: percentiles.flexibility_percentile,
      sprint_30m_first_percentile: percentiles.sprint_30m_first_percentile,
      sprint_30m_second_percentile: percentiles.sprint_30m_second_percentile,
      fatigue_index_percentile: percentiles.fatigue_index_percentile,
      agility_percentile: percentiles.agility_percentile,
      vertical_jump_percentile: percentiles.vertical_jump_percentile,
      overall_percentile: percentiles.overall_percentile,
      // Puanları da kaydet
      height_score: percentiles.height_score,
      weight_score: percentiles.weight_score,
      bmi_score: percentiles.bmi_score,
      ffmi_score: percentiles.ffmi_score,
      flexibility_score: percentiles.flexibility_score,
      sprint_30m_first_score: percentiles.sprint_30m_first_score,
      sprint_30m_second_score: percentiles.sprint_30m_second_score,
      fatigue_index_score: percentiles.fatigue_index_score,
      agility_score: percentiles.agility_score,
      vertical_jump_score: percentiles.vertical_jump_score,
    });

    return res.status(201).json({
      success: true,
      data: {
        testResult,
        percentileResult,
      },
      message: "Test sonucu başarıyla eklendi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Test sonucu eklenirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const getAthleteTestHistory = async (req: Request, res: Response) => {
  try {
    const { athlete_id } = req.params;

    const athlete = await Athlete.findOne({
      where: { id: athlete_id },
      include: [
        {
          association: "testResults",
          include: ["testSession", "percentileResult"],
          order: [["created_at", "DESC"]],
        },
      ],
    });

    if (!athlete) {
      return res.status(404).json({
        success: false,
        message: "Sporcu bulunamadı",
      });
    }

    return res.status(200).json({
      success: true,
      data: athlete,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Test geçmişi getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const getAllTestSessions = async (req: Request, res: Response) => {
  try {
    const testSessions = await TestSession.findAll({
      include: [
        "club",
        {
          association: "testResults",
          include: ["athlete", "percentileResult"],
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

export const getClubTestSessions = async (req: Request, res: Response) => {
  try {
    const { club_id } = req.params;

    const testSessions = await TestSession.findAll({
      where: { club_id },
      include: [
        "club",
        {
          association: "testResults",
          include: ["athlete", "percentileResult"],
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

// Yardımcı fonksiyon: Yüzdelik dilimleri hesapla
async function calculatePercentiles(
  testResult: any,
  athlete: any,
  ageGroupAthletes: any[]
) {
  // Tüm yaş grubundaki test sonuçlarını al
  const allTestResults = [];
  for (const athlete of ageGroupAthletes) {
    allTestResults.push(...athlete.testResults);
  }

  // Her parametre için yüzdelik dilim hesapla
  const heightValues = ageGroupAthletes.map((a) => a.height);
  const weightValues = ageGroupAthletes.map((a) => a.weight);
  const bmiValues = ageGroupAthletes.map((a) => a.bmi);
  const ffmiValues = ageGroupAthletes.map((a) => a.ffmi);
  const flexibilityValues = allTestResults.map((tr) => tr.flexibility);
  const sprintFirstValues = allTestResults.map((tr) => tr.sprint_30m_first);
  const sprintSecondValues = allTestResults.map((tr) => tr.sprint_30m_second);
  const fatigueValues = allTestResults.map((tr) => tr.fatigue_index);
  const agilityValues = allTestResults.map((tr) => tr.agility);
  const verticalJumpValues = allTestResults.map((tr) => tr.vertical_jump);

  // Yüzdelik dilimleri hesapla
  const height_percentile = calculatePercentile(athlete.height, heightValues);
  const weight_percentile = calculatePercentile(athlete.weight, weightValues);
  const bmi_percentile = calculatePercentile(athlete.bmi, bmiValues);
  const ffmi_percentile = calculatePercentile(athlete.ffmi, ffmiValues);
  const flexibility_percentile = calculatePercentile(
    testResult.flexibility,
    flexibilityValues
  );
  const sprint_30m_first_percentile = calculatePercentile(
    testResult.sprint_30m_first,
    sprintFirstValues,
    true
  );
  const sprint_30m_second_percentile = calculatePercentile(
    testResult.sprint_30m_second,
    sprintSecondValues,
    true
  );
  const fatigue_index_percentile = calculatePercentile(
    testResult.fatigue_index,
    fatigueValues,
    true
  );
  const agility_percentile = calculatePercentile(
    testResult.agility,
    agilityValues,
    true
  );
  const vertical_jump_percentile = calculatePercentile(
    testResult.vertical_jump,
    verticalJumpValues
  );

  // Her parametre için puan hesapla (100 - yüzdelik dilim)
  const height_score = calculateScore(height_percentile);
  const weight_score = calculateScore(weight_percentile);
  const bmi_score = calculateScore(bmi_percentile);
  const ffmi_score = calculateScore(ffmi_percentile);
  const flexibility_score = calculateScore(flexibility_percentile);
  const sprint_30m_first_score = calculateScore(sprint_30m_first_percentile);
  const sprint_30m_second_score = calculateScore(sprint_30m_second_percentile);
  const fatigue_index_score = calculateScore(fatigue_index_percentile);
  const agility_score = calculateScore(agility_percentile);
  const vertical_jump_score = calculateScore(vertical_jump_percentile);

  // Genel performans puanı hesapla
  const scores = [
    height_score,
    weight_score,
    bmi_score,
    ffmi_score,
    flexibility_score,
    sprint_30m_first_score,
    sprint_30m_second_score,
    fatigue_index_score,
    agility_score,
    vertical_jump_score,
  ];

  const overall_percentile = calculateOverallScore(scores);

  return {
    height_percentile,
    weight_percentile,
    bmi_percentile,
    ffmi_percentile,
    flexibility_percentile,
    sprint_30m_first_percentile,
    sprint_30m_second_percentile,
    fatigue_index_percentile,
    agility_percentile,
    vertical_jump_percentile,
    overall_percentile,
    // Puanları da döndür
    height_score,
    weight_score,
    bmi_score,
    ffmi_score,
    flexibility_score,
    sprint_30m_first_score,
    sprint_30m_second_score,
    fatigue_index_score,
    agility_score,
    vertical_jump_score,
  };
}
