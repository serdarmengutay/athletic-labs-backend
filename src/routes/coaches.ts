import { Router } from "express";
import {
  getAllCoaches,
  getCoachById,
  createCoach,
  updateCoach,
  deleteCoach,
  getCoachesByStation,
} from "../controllers/coachController";
import { authenticateCoach } from "../middleware/auth";

const router = Router();

// Coach route'ları
router.get("/", getAllCoaches);
router.get("/:id", getCoachById);
router.post("/", createCoach);
router.put("/:id", updateCoach);
router.delete("/:id", deleteCoach);
router.get("/station/:stationId", getCoachesByStation);

export default router;
