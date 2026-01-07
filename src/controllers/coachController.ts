import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Coach } from "../models";

// Tüm antrenörleri getir
export const getAllCoaches = async (req: Request, res: Response) => {
  try {
    const coaches = await Coach.findAll({
      attributes: { exclude: ["password_hash"] },
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: coaches,
      count: coaches.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Antrenörler getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// ID ile antrenör getir
export const getCoachById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const coach = await Coach.findOne({
      where: { id },
      attributes: { exclude: ["password_hash"] },
    });

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: "Antrenör bulunamadı",
      });
    }

    return res.status(200).json({
      success: true,
      data: coach,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Antrenör getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// Yeni antrenör oluştur
export const createCoach = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, assigned_stations } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Ad, email, şifre ve rol gerekli",
      });
    }

    // Email zaten var mı kontrol et
    const existingCoach = await Coach.findOne({ where: { email } });

    if (existingCoach) {
      return res.status(400).json({
        success: false,
        message: "Bu email adresi zaten kullanılıyor",
      });
    }

    // Şifreyi hashle
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Antrenör oluştur
    const coach = await Coach.create({
      name,
      email,
      password_hash,
      role,
      assigned_stations: assigned_stations || [],
    });

    return res.status(201).json({
      success: true,
      data: {
        id: coach.id,
        name: coach.name,
        email: coach.email,
        role: coach.role,
        assigned_stations: coach.assigned_stations,
      },
      message: "Antrenör başarıyla oluşturuldu",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Antrenör oluşturulurken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// Antrenör güncelle
export const updateCoach = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, role, assigned_stations } = req.body;

    const coach = await Coach.findOne({ where: { id } });

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: "Antrenör bulunamadı",
      });
    }

    // Email değişiyorsa kontrol et
    if (email && email !== coach.email) {
      const existingCoach = await Coach.findOne({ where: { email } });
      if (existingCoach) {
        return res.status(400).json({
          success: false,
          message: "Bu email adresi zaten kullanılıyor",
        });
      }
      coach.email = email;
    }

    // Güncelle
    if (name) coach.name = name;
    if (role) coach.role = role;
    if (assigned_stations) coach.assigned_stations = assigned_stations;

    await coach.save();

    return res.status(200).json({
      success: true,
      data: {
        id: coach.id,
        name: coach.name,
        email: coach.email,
        role: coach.role,
        assigned_stations: coach.assigned_stations,
      },
      message: "Antrenör güncellendi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Antrenör güncellenirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// Antrenör sil
export const deleteCoach = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const coach = await Coach.findOne({ where: { id } });

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: "Antrenör bulunamadı",
      });
    }

    await coach.destroy();

    return res.status(200).json({
      success: true,
      message: "Antrenör silindi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Antrenör silinirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// İstasyona göre antrenörleri getir
export const getCoachesByStation = async (req: Request, res: Response) => {
  try {
    const { stationId } = req.params;

    const coaches = await Coach.findAll({
      where: {
        assigned_stations: {
          [require("sequelize").Op.contains]: [stationId],
        },
      },
      attributes: { exclude: ["password_hash"] },
    });

    return res.status(200).json({
      success: true,
      data: coaches,
      count: coaches.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "İstasyon antrenörleri getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};
