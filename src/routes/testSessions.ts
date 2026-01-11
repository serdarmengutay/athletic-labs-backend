import { Router } from "express";
import {
  createTestSession,
  getAllTestSessions,
  getTestSessionById,
  getSessionStatus,
  bulkImportAthletes,
  getSessionAthletes,
  saveMeasurements,
  calculateReport,
} from "../controllers/testSessionController";

const router = Router();

// Test Session CRUD
router.post("/", createTestSession);
router.get("/", getAllTestSessions);
router.get("/:id", getTestSessionById);
router.get("/:id/status", getSessionStatus);

// Calculate performance report
router.post("/:id/calculate-report", calculateReport);

// Athletes in session
router.post("/:testSessionId/athletes", bulkImportAthletes);
router.get("/:testSessionId/athletes", getSessionAthletes);

export default router;
