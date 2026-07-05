import { Router } from "express";
import {
  createTestSession,
  updateTestSession,
  deleteTestSession,
  getAllTestSessions,
  getTestSessionById,
  getSessionStatus,
  bulkImportAthletes,
  getSessionAthletes,
  saveMeasurements,
  calculateReport,
  importXOneQr,
  exportSessionFieldData,
} from "../controllers/testSessionController";

const router = Router();

// Test Session CRUD
router.post("/", createTestSession);
router.get("/", getAllTestSessions);
router.get("/:testSessionId/field-data.xlsx", exportSessionFieldData);
router.get("/:id", getTestSessionById);
router.patch("/:id", updateTestSession);
router.delete("/:id", deleteTestSession);
router.get("/:id/status", getSessionStatus);

// Calculate performance report
router.post("/:id/calculate-report", calculateReport);

// Athletes in session
router.post("/:testSessionId/athletes", bulkImportAthletes);
router.get("/:testSessionId/athletes", getSessionAthletes);
router.post("/:testSessionId/x-one/import-qr", importXOneQr);

export default router;
