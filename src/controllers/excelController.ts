// TODO MVP: Excel controller disabled for MVP
// Re-enable after MVP when Club/Station models are active again
import { Request, Response } from "express";

export const uploadAthletes = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Excel upload is disabled for MVP",
  });
};

export const downloadAthletes = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Excel download is disabled for MVP",
  });
};

export const downloadSampleTemplate = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Excel template is disabled for MVP",
  });
};
