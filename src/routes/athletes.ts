import { Router } from "express";
import {
  getAllAthletes,
  getAthleteById,
  createAthlete,
  updateAthlete,
  deleteAthlete,
  importAthletes,
} from "../controllers/athleteController";

const router = Router();

// Athlete route'ları
router.get("/", getAllAthletes);
router.get("/:id", getAthleteById);
router.post("/", createAthlete);
router.put("/:id", updateAthlete);
router.delete("/:id", deleteAthlete);
router.post("/import", importAthletes);

export default router;
