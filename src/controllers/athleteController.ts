// TODO MVP: Simplified athlete controller for MVP
import { Request, Response } from "express";
import { Athlete } from "../models";

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
    const { full_name, birth_year, birth_date } = req.body;

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
    const { full_name, birth_year, birth_date } = req.body;

    const athlete = await Athlete.findOne({ where: { id } });

    if (!athlete) {
      return res.status(404).json({
        success: false,
        message: "Sporcu bulunamadı",
      });
    }

    if (full_name) athlete.full_name = full_name;
    if (birth_year) athlete.birth_year = birth_year;
    if (birth_date) athlete.birth_date = new Date(birth_date);

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
