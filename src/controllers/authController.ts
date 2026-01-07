import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Coach } from "../models";

export const coachLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email ve şifre gerekli",
      });
    }

    // Hoca bilgilerini getir
    const coach = await Coach.findOne({ where: { email } });

    if (!coach) {
      return res.status(401).json({
        success: false,
        message: "Geçersiz email veya şifre",
      });
    }

    // Şifre kontrolü
    const isPasswordValid = await bcrypt.compare(password, coach.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Geçersiz email veya şifre",
      });
    }

    // JWT token oluştur
    const token = jwt.sign(
      {
        coachId: coach.id,
        email: coach.email,
        role: coach.role,
      },
      process.env.JWT_SECRET || "default-secret",
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      success: true,
      data: {
        token,
        coach: {
          id: coach.id,
          name: coach.name,
          email: coach.email,
          role: coach.role,
          assigned_stations: coach.assigned_stations,
        },
      },
      message: "Giriş başarılı",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Giriş yapılırken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

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

    // Hoca oluştur
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
      message: "Hoca başarıyla oluşturuldu",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Hoca oluşturulurken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const getCoachProfile = async (req: Request, res: Response) => {
  try {
    const coachId = (req as any).coach?.id;

    if (!coachId) {
      return res.status(401).json({
        success: false,
        message: "Kimlik doğrulama gerekli",
      });
    }

    const coach = await Coach.findOne({
      where: { id: coachId },
      attributes: { exclude: ["password_hash"] },
    });

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: "Hoca bulunamadı",
      });
    }

    return res.status(200).json({
      success: true,
      data: coach,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Profil bilgileri getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const updateCoachProfile = async (req: Request, res: Response) => {
  try {
    const coachId = (req as any).coach?.id;
    const { name, assigned_stations } = req.body;

    if (!coachId) {
      return res.status(401).json({
        success: false,
        message: "Kimlik doğrulama gerekli",
      });
    }

    const coach = await Coach.findOne({ where: { id: coachId } });

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: "Hoca bulunamadı",
      });
    }

    // Güncelle
    if (name) coach.name = name;
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
      message: "Profil güncellendi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Profil güncellenirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};
