import { Router } from "express";
import {
  importHistoricalAthletes,
  getAllHistoricalAthletes,
  getHistoricalStats,
  upload,
} from "../controllers/historicalAthletesController";

const router = Router();

// Import from Excel
router.post("/import", upload.single("file"), importHistoricalAthletes);

// List and stats
router.get("/", getAllHistoricalAthletes);
router.get("/stats", getHistoricalStats);

export default router;
