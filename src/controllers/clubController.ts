// TODO MVP: This entire controller is commented out for MVP
// Re-enable after MVP when Club model is active again
/*
import { Request, Response } from "express";
import { Club } from "../models";

export const getAllClubs = async (req: Request, res: Response) => {
  try {
    const clubs = await Club.findAll({
      include: ["athletes", "testSessions"],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: clubs,
      count: clubs.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Kulüpler getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

... rest of file commented out for MVP ...
*/

import { Request, Response } from "express";

// Placeholder exports to prevent import errors
export const getAllClubs = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Club API is disabled for MVP",
  });
};

export const getClubById = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Club API is disabled for MVP",
  });
};

export const createClub = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Club API is disabled for MVP",
  });
};

export const updateClub = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Club API is disabled for MVP",
  });
};

export const deleteClub = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Club API is disabled for MVP",
  });
};
