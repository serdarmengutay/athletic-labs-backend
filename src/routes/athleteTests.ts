import { Router } from "express";
import { saveMeasurements } from "../controllers/testSessionController";

const router = Router();

// Measurements for athlete test
router.post("/:athleteTestId/measurements", saveMeasurements);

export default router;
