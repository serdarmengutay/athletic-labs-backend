import { Router } from "express";
import {
  createTestSession,
  addTestResult,
  getAthleteTestHistory,
  getAllTestSessions,
  getClubTestSessions,
  getTestSessionById,
  updateTestSessionStatus,
  addAthleteToSession,
  saveMeasurement,
  completeAthleteTest,
} from "../controllers/testController";

const router = Router();

// MVP Test route'ları
router.post("/sessions", createTestSession);
router.get("/sessions", getAllTestSessions);
router.get("/sessions/:id", getTestSessionById);
router.patch("/sessions/:id/status", updateTestSessionStatus);

// AthleteTest routes
router.post("/athlete-test", addAthleteToSession);
router.post("/athlete-test/complete", completeAthleteTest);

// Measurement routes
router.post("/measurement", saveMeasurement);

// TODO MVP: Legacy routes (disabled)
router.post("/results", addTestResult);
router.get("/athlete/:athlete_id/history", getAthleteTestHistory);
router.get("/club/:club_id/sessions", getClubTestSessions);

export default router;
