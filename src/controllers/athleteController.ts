// TODO MVP: Simplified athlete controller for MVP
import { Request, Response } from "express";
import { Athlete } from "../models";
import { normalizeGender } from "../config/gender";

export const getAllAthletes = async (_req: Request, res: Response) => {
  try {
    const athletes = await Athlete.findAll({
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
    const { full_name, birth_year, birth_date, gender } = req.body;

    if (!full_name || !birth_year) {
      return res.status(400).json({
        success: false,
        message: "İsim ve doğum yılı gerekli",
      });
    }

    const athlete = await Athlete.create({
      full_name,
      birth_year,
      birth_date: birth_date ? new Date(birth_date) : null,
      gender: normalizeGender(gender),
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
    const { full_name, birth_year, birth_date, gender } = req.body;

    const athlete = await Athlete.findOne({ where: { id } });

    if (!athlete) {
      return res.status(404).json({
        success: false,
        message: "Sporcu bulunamadı",
      });
    }

    if (full_name !== undefined) {
      const normalizedName = String(full_name).trim().replace(/\s+/g, " ");
      if (!normalizedName) {
        return res.status(400).json({
          success: false,
          message: "Sporcu adı boş olamaz",
        });
      }
      athlete.full_name = normalizedName;
    }

    let normalizedBirthYear: number | undefined;
    if (birth_year !== undefined) {
      normalizedBirthYear = Number(birth_year);
      const currentYear = new Date().getFullYear();
      if (
        !Number.isInteger(normalizedBirthYear) ||
        normalizedBirthYear < 1900 ||
        normalizedBirthYear > currentYear
      ) {
        return res.status(400).json({
          success: false,
          message: "Geçerli bir doğum yılı giriniz",
        });
      }
    }

    if (birth_date !== undefined) {
      const parsedBirthDate = new Date(String(birth_date));
      if (Number.isNaN(parsedBirthDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Geçerli bir doğum tarihi giriniz",
        });
      }
      // Tarih gönderildiğinde yıl bu tarihten türetilerek iki alan tutarlı tutulur.
      athlete.birth_date = parsedBirthDate;
      athlete.birth_year = parsedBirthDate.getUTCFullYear();
    } else if (normalizedBirthYear !== undefined) {
      athlete.birth_year = normalizedBirthYear;
    }
    if (gender !== undefined) athlete.gender = normalizeGender(gender);

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

// TODO MVP: Bulk import disabled - old model structure
export const importAthletes = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Bulk import is disabled for MVP",
  });
};
