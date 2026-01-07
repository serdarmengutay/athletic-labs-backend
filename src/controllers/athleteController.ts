import { Request, Response } from "express";
import { Athlete, Club } from "../models";
import {
  generateAthleteCode,
  calculateBMI,
  calculateFFMI,
} from "../utils/calculations";

export const getAllAthletes = async (req: Request, res: Response) => {
  try {
    const athletes = await Athlete.findAll({
      include: ["club"],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: athletes,
      count: athletes.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Sporcular getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const getAthleteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const athlete = await Athlete.findOne({
      where: { id },
      include: ["club"],
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
      message: "Sporcu getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const createAthlete = async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, birth_year, height, weight, club_id } =
      req.body;

    if (
      !first_name ||
      !last_name ||
      !birth_year ||
      !height ||
      !weight ||
      !club_id
    ) {
      return res.status(400).json({
        success: false,
        message: "Tüm alanlar gerekli",
      });
    }

    // BMI ve FFMI hesapla
    const bmi = calculateBMI(height, weight);
    const ffmi = calculateFFMI(height, weight, 15); // Varsayılan %15 vücut yağı

    // Mevcut sporcuları getir (sporcu kodu oluşturmak için)
    const existingAthletes = await Athlete.findAll();
    const athleteCode = await generateAthleteCode(birth_year, existingAthletes);

    const athlete = await Athlete.create({
      first_name,
      last_name,
      birth_year,
      height,
      weight,
      bmi: Math.round(bmi * 100) / 100,
      ffmi: Math.round(ffmi * 100) / 100,
      club_id,
      athlete_code: athleteCode,
    });

    return res.status(201).json({
      success: true,
      data: athlete,
      message: "Sporcu başarıyla oluşturuldu",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Sporcu oluşturulurken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const updateAthlete = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, birth_year, height, weight, club_id } =
      req.body;

    const athlete = await Athlete.findOne({ where: { id } });

    if (!athlete) {
      return res.status(404).json({
        success: false,
        message: "Sporcu bulunamadı",
      });
    }

    // Güncelle
    if (first_name) athlete.first_name = first_name;
    if (last_name) athlete.last_name = last_name;
    if (birth_year) athlete.birth_year = birth_year;
    if (height) athlete.height = height;
    if (weight) athlete.weight = weight;
    if (club_id) athlete.club_id = club_id;

    // BMI ve FFMI yeniden hesapla
    if (height && weight) {
      athlete.bmi = Math.round(calculateBMI(height, weight) * 100) / 100;
      athlete.ffmi = Math.round(calculateFFMI(height, weight, 15) * 100) / 100;
    }

    await athlete.save();

    return res.status(200).json({
      success: true,
      data: athlete,
      message: "Sporcu güncellendi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Sporcu güncellenirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const deleteAthlete = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const athlete = await Athlete.findOne({ where: { id } });

    if (!athlete) {
      return res.status(404).json({
        success: false,
        message: "Sporcu bulunamadı",
      });
    }

    await athlete.destroy();

    return res.status(200).json({
      success: true,
      message: "Sporcu silindi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Sporcu silinirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const importAthletes = async (req: Request, res: Response) => {
  try {
    const { club_id, athletes } = req.body;

    if (!club_id || !athletes || !Array.isArray(athletes)) {
      return res.status(400).json({
        success: false,
        message: "Kulüp ID ve sporcu listesi gerekli",
      });
    }

    const createdAthletes = [];
    let existingAthletes = await Athlete.findAll();

    for (const athleteData of athletes) {
      const { first_name, last_name, birth_year, height, weight } = athleteData;

      if (!first_name || !last_name || !birth_year || !height || !weight) {
        continue; // Eksik veri olan sporcuları atla
      }

      // BMI ve FFMI hesapla
      const bmi = calculateBMI(height, weight);
      const ffmi = calculateFFMI(height, weight, 15);
      const athleteCode = await generateAthleteCode(
        birth_year,
        existingAthletes
      );

      const athlete = await Athlete.create({
        first_name,
        last_name,
        birth_year,
        height,
        weight,
        bmi: Math.round(bmi * 100) / 100,
        ffmi: Math.round(ffmi * 100) / 100,
        club_id,
        athlete_code: athleteCode,
      });

      createdAthletes.push(athlete);
      // Yeni oluşturulan sporcuyu existingAthletes listesine ekle
      existingAthletes.push(athlete);
    }

    return res.status(201).json({
      success: true,
      data: createdAthletes,
      message: `${createdAthletes.length} sporcu başarıyla içe aktarıldı`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Sporcular içe aktarılırken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};
