import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Coach } from "../models";

interface AuthRequest extends Request {
  coach?: any;
}

export const authenticateCoach = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Erişim token'ı gerekli",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default-secret"
    ) as any;
    const coach = await Coach.findByPk(decoded.coachId);

    if (!coach) {
      return res.status(401).json({
        success: false,
        message: "Geçersiz token",
      });
    }

    req.coach = coach;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Geçersiz token",
    });
  }
};

export const requireStationAccess = (stationId: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.coach) {
      return res.status(401).json({
        success: false,
        message: "Kimlik doğrulama gerekli",
      });
    }

    // Admin ve supervisor tüm istasyonlara erişebilir
    if (req.coach.role === "admin" || req.coach.role === "supervisor") {
      return next();
    }

    // Station coach sadece atandığı istasyonlara erişebilir
    if (
      req.coach.role === "station_coach" &&
      req.coach.assigned_stations.includes(stationId)
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Bu istasyona erişim yetkiniz yok",
    });
  };
};
