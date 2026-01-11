// TODO MVP: Excel routes disabled for MVP
import { Router } from "express";
import {
  uploadAthletes,
  downloadAthletes,
  downloadSampleTemplate,
} from "../controllers/excelController";

const router = Router();

// TODO MVP: All Excel endpoints disabled
router.post("/import-athletes", uploadAthletes);
router.get("/template", downloadSampleTemplate);
router.get("/export-athletes/:clubId/:sessionId", downloadAthletes);

export default router;
