// TODO MVP: QR Controller is disabled for MVP
// The route using this controller is already commented out in server.ts
// Re-enable after MVP when QR authentication is needed
import { Request, Response } from "express";

export const generateQRCode = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "QR API is disabled for MVP",
  });
};

export const validateQRCode = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "QR API is disabled for MVP",
  });
};

export const generateBulkQRCodes = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "QR API is disabled for MVP",
  });
};
