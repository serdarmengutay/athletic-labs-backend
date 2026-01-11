import { Router } from "express";
import {
  importHistoricalTests,
  getAllHistoricalTests,
  upload,
} from "../controllers/historicalTestsController";

const router = Router();

// Import historical tests from Excel
router.post("/import", upload.single("file"), importHistoricalTests);

// List all historical test sessions
router.get("/", getAllHistoricalTests);

export default router;
