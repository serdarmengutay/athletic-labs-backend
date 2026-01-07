import { Router } from "express";
import {
  importAthletesFromExcel,
  downloadExcelTemplate,
  exportAthletesToExcel,
  upload,
} from "../controllers/excelController";

const router = Router();

// Excel dosyasından sporcu listesi import et
router.post(
  "/import-athletes",
  upload.single("excelFile"),
  importAthletesFromExcel
);

// Excel template indir
router.get("/template", downloadExcelTemplate);

// Kulüp sporcularını Excel olarak export et
router.get("/export-athletes/:clubId/:sessionId", exportAthletesToExcel);

export default router;
