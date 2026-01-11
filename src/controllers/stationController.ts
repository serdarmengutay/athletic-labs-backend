// TODO MVP: Station Controller is disabled for MVP
// The route using this controller is already commented out in server.ts
// Re-enable after MVP when station-based testing is needed
import { Request, Response } from "express";

export const getAthleteByQR = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Station API is disabled for MVP",
  });
};

export const saveStationData = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Station API is disabled for MVP",
  });
};

export const getStations = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Station API is disabled for MVP",
  });
};

export const createStation = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Station API is disabled for MVP",
  });
};

export const getAthleteTestStatus = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Station API is disabled for MVP",
  });
};

export const submitTestData = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Station API is disabled for MVP",
  });
};

export const getStationQueue = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Station API is disabled for MVP",
  });
};

export const addToQueue = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Station API is disabled for MVP",
  });
};

export const getSessionStatus = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Station API is disabled for MVP",
  });
};

export const getStationData = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Station API is disabled for MVP",
  });
};

export const getAthleteData = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Station API is disabled for MVP",
  });
};

export const getActiveSession = async (_req: Request, res: Response) => {
  return res.status(503).json({
    success: false,
    message: "Station API is disabled for MVP",
  });
};
