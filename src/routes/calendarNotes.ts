import { Router } from "express";
import {
  createCalendarNote,
  deleteCalendarNote,
  listCalendarNotes,
  updateCalendarNote,
} from "../controllers/calendarNoteController";

const router = Router();

router.get("/", listCalendarNotes);
router.post("/", createCalendarNote);
router.patch("/:id", updateCalendarNote);
router.delete("/:id", deleteCalendarNote);

export default router;
