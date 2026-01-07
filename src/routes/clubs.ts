import { Router } from "express";
import {
  getAllClubs,
  getClubById,
  createClub,
  updateClub,
  deleteClub,
} from "../controllers/clubController";

const router = Router();

// Club route'ları
router.get("/", getAllClubs);
router.get("/:id", getClubById);
router.post("/", createClub);
router.put("/:id", updateClub);
router.delete("/:id", deleteClub);

export default router;
