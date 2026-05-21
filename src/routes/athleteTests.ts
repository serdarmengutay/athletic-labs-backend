import { Router } from "express";
import {
  saveMeasurements,
  updateAthleteTestStatus,
} from "../controllers/testSessionController";

const router = Router();

// Measurements for athlete test
router.post("/:athleteTestId/measurements", saveMeasurements);
router.patch("/:athleteTestId/status", updateAthleteTestStatus);

export default router;
