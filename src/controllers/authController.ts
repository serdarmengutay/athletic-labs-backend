// TODO MVP: This controller uses old Coach model for auth
// Using direct import from Coach.ts instead of index.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Coach from "../models/Coach";

export const coachLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email ve şifre gerekli",
      });
    }

    const coach = await Coach.findOne({ where: { email } });

    if (!coach) {
      return res.status(401).json({
        success: false,
        message: "Geçersiz email veya şifre",
      });
    }

    const isValidPassword = await bcrypt.compare(password, coach.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Geçersiz email veya şifre",
      });
    }

    const token = jwt.sign(
      { coachId: coach.id },
      process.env.JWT_SECRET || "default-secret",
      { expiresIn: "24h" }
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
        message: "İsim, email, şifre ve rol gerekli",
      });
    }

    const existingCoach = await Coach.findOne({ where: { email } });
    if (existingCoach) {
      return res.status(400).json({
        success: false,
        message: "Bu email adresi zaten kullanılıyor",
      });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const coach = await Coach.create({
      name,
      email,
      password_hash,
      role,
      assigned_stations: assigned_stations || [],
    });

    const token = jwt.sign(
      { coachId: coach.id },
      process.env.JWT_SECRET || "default-secret",
      { expiresIn: "24h" }
    );

    return res.status(201).json({
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
      message: "Kayıt başarılı",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Kayıt yapılırken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const getCoachProfile = async (req: any, res: Response) => {
  try {
    const coach = req.coach;

    return res.status(200).json({
      success: true,
      data: {
        id: coach.id,
        name: coach.name,
        email: coach.email,
        role: coach.role,
        assigned_stations: coach.assigned_stations,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Profil getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const updateCoachProfile = async (req: any, res: Response) => {
  try {
    const coach = req.coach;
    const { name, assigned_stations } = req.body;

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
