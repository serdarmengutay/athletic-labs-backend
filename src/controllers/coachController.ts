// TODO MVP: This controller uses old Coach/role model
// Re-enable after MVP when Coach roles are active again
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import Coach from "../models/Coach";

export const getAllCoaches = async (_req: Request, res: Response) => {
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

// TODO MVP: getCoachesByStation disabled
export const getCoachesByStation = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Station-based coach API is disabled for MVP",
  });
};
