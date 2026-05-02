import { Router } from "express";
import {
  getScoutingFilterOptions,
  getScoutingPlayerDetail,
  getScoutingPlayers,
} from "../controllers/scoutingController";

const router = Router();

router.get("/players", getScoutingPlayers);
router.get("/players/:athleteTestId", getScoutingPlayerDetail);
router.get("/filters", getScoutingFilterOptions);

export default router;
