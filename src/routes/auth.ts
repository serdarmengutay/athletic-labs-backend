import { Router } from "express";
import {
  coachLogin,
  createCoach,
  getCoachProfile,
  updateCoachProfile,
} from "../controllers/authController";
import { authenticateCoach } from "../middleware/auth";

const router = Router();

// Auth route'ları
router.post("/coach/login", coachLogin);
router.post("/coach/register", createCoach);
router.get("/coach/profile", authenticateCoach, getCoachProfile);
router.put("/coach/profile", authenticateCoach, updateCoachProfile);

export default router;
