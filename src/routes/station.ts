import { Router } from "express";
import {
  getAthleteByQR,
  saveStationData,
  getStations,
  createStation,
  getAthleteTestStatus,
  submitTestData,
  getStationQueue,
  addToQueue,
  getSessionStatus,
  getStationData,
  getAthleteData,
  getActiveSession,
} from "../controllers/stationController";

const router = Router();

// QR kod ile sporcu bilgilerini getir
router.post("/athlete-by-qr", getAthleteByQR);

// İstasyon verilerini kaydet
router.post("/save-data", saveStationData);

// Test verisi gönder
router.post("/test", submitTestData);

// İstasyon sırasını getir
router.get("/queue", getStationQueue);

// Sporcu sıraya ekle
router.post("/queue", addToQueue);

// Oturum durumunu getir
router.get("/sessions/:sessionId/status", getSessionStatus);

// İstasyon verilerini getir
router.get("/:stationId/data", getStationData);

// Sporcu verilerini getir
router.get("/athlete/:athleteId/station/:stationId", getAthleteData);

// Aktif oturumu getir
router.get("/:stationId/active-session", getActiveSession);

// Tüm istasyonları getir
router.get("/", getStations);

// İstasyon oluştur
router.post("/", createStation);

// Sporcu test durumunu getir
router.get(
  "/athlete/:athleteId/session/:sessionId/status",
  getAthleteTestStatus
);

export default router;
