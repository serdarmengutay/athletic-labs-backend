import { Router } from "express";
import {
  createTestSession,
  addTestResult,
  getAthleteTestHistory,
  getAllTestSessions,
  getClubTestSessions,
} from "../controllers/testController";

const router = Router();

// Test route'ları
router.post("/sessions", createTestSession);
router.post("/results", addTestResult);
router.get("/sessions", getAllTestSessions);
router.get("/athlete/:athlete_id/history", getAthleteTestHistory);
router.get("/club/:club_id/sessions", getClubTestSessions);

export default router;
