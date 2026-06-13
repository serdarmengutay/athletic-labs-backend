import { Router } from "express";
import {
  getMeasurements,
  saveMeasurements,
  updateAthleteTestStatus,
} from "../controllers/testSessionController";

const router = Router();

// Measurements for athlete test
router.get("/:athleteTestId/measurements", getMeasurements);
router.post("/:athleteTestId/measurements", saveMeasurements);
router.patch("/:athleteTestId/status", updateAthleteTestStatus);

export default router;
