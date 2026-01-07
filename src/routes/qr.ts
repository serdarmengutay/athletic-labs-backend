import { Router } from "express";
import {
  generateQRCode,
  validateQRCode,
  generateBulkQRCodes,
} from "../controllers/qrController";

const router = Router();

// QR kod route'ları
router.post("/generate", generateQRCode);
router.post("/validate", validateQRCode);
router.post("/bulk-generate", generateBulkQRCodes);

export default router;
