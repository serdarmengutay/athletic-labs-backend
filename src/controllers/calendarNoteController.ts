// Panel takviminde ekibin ortak kullandığı plan notları.
import { Response } from "express";
import { Op, WhereOptions } from "sequelize";
import { CalendarNote, TestSession } from "../models";
import { AuthenticatedRequest } from "../middleware/firebaseAuth";
import {
  CalendarNoteInput,
  isUuid,
  isValidDateKey,
  parseCalendarNoteInput,
} from "../utils/calendarNoteInput";

const serializeNote = (note: CalendarNote) => ({
  id: note.id,
  noteDate: note.note_date,
  noteTime: note.note_time,
  testSessionId: note.test_session_id,
  text: note.text,
  category: note.category,
  isDone: note.is_done,
  createdByEmail: note.created_by_email,
  updatedByEmail: note.updated_by_email,
  createdAt: note.created_at,
  updatedAt: note.updated_at,
});

const ensureSessionExists = async (
  input: CalendarNoteInput,
  res: Response,
): Promise<boolean> => {
  if (!input.testSessionId) return true;
  const session = await TestSession.findByPk(input.testSessionId, {
    attributes: ["id"],
  });
  if (session) return true;
  res.status(400).json({
    success: false,
    message: "Not bağlanmak istenen test oturumu bulunamadı",
  });
  return false;
};

/**
 * GET /api/internal/calendar-notes?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Tarih aralığı opsiyoneldir; verilmezse bütün notlar döner.
 */
export const listCalendarNotes = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { from, to } = req.query;
    if (
      (from !== undefined && !isValidDateKey(from)) ||
      (to !== undefined && !isValidDateKey(to))
    ) {
      return res.status(400).json({
        success: false,
        message: "from/to YYYY-AA-GG biçiminde olmalı",
      });
    }

    const dateFilter: Record<symbol, string> = {};
    if (from) dateFilter[Op.gte] = from as string;
    if (to) dateFilter[Op.lte] = to as string;
    const where: WhereOptions = from || to ? { note_date: dateFilter } : {};

    const notes = await CalendarNote.findAll({
      where,
      order: [
        ["note_date", "ASC"],
        ["created_at", "ASC"],
      ],
    });

    return res.status(200).json({
      success: true,
      data: notes.map(serializeNote),
      count: notes.length,
    });
  } catch (error) {
    console.error("listCalendarNotes error:", error);
    return res.status(500).json({
      success: false,
      message: "Takvim notları getirilirken hata oluştu",
    });
  }
};

/**
 * POST /api/internal/calendar-notes
 */
export const createCalendarNote = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const parsed = parseCalendarNoteInput(req.body, { partial: false });
    if (!parsed.ok) {
      return res.status(400).json({ success: false, message: parsed.message });
    }
    const input = parsed.value;
    if (!(await ensureSessionExists(input, res))) return;

    const note = await CalendarNote.create({
      note_date: input.noteDate as string,
      note_time: input.noteTime ?? null,
      test_session_id: input.testSessionId ?? null,
      text: input.text as string,
      category: input.category ?? "note",
      is_done: input.isDone ?? false,
      created_by_uid: req.user?.uid ?? null,
      created_by_email: req.user?.email ?? null,
      updated_by_email: req.user?.email ?? null,
    });

    return res.status(201).json({ success: true, data: serializeNote(note) });
  } catch (error) {
    console.error("createCalendarNote error:", error);
    return res.status(500).json({
      success: false,
      message: "Takvim notu kaydedilirken hata oluştu",
    });
  }
};

/**
 * PATCH /api/internal/calendar-notes/:id
 */
export const updateCalendarNote = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const parsed = parseCalendarNoteInput(req.body, { partial: true });
    if (!parsed.ok) {
      return res.status(400).json({ success: false, message: parsed.message });
    }
    const input = parsed.value;

    const note = isUuid(req.params.id)
      ? await CalendarNote.findByPk(req.params.id)
      : null;
    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Takvim notu bulunamadı",
      });
    }
    if (!(await ensureSessionExists(input, res))) return;

    if (input.noteDate !== undefined) note.note_date = input.noteDate;
    if (input.noteTime !== undefined) note.note_time = input.noteTime;
    if (input.testSessionId !== undefined) {
      note.test_session_id = input.testSessionId;
    }
    if (input.text !== undefined) note.text = input.text;
    if (input.category !== undefined) note.category = input.category;
    if (input.isDone !== undefined) note.is_done = input.isDone;
    note.updated_by_email = req.user?.email ?? null;
    await note.save();

    return res.status(200).json({ success: true, data: serializeNote(note) });
  } catch (error) {
    console.error("updateCalendarNote error:", error);
    return res.status(500).json({
      success: false,
      message: "Takvim notu güncellenirken hata oluştu",
    });
  }
};

/**
 * DELETE /api/internal/calendar-notes/:id
 */
export const deleteCalendarNote = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const deleted = isUuid(req.params.id)
      ? await CalendarNote.destroy({ where: { id: req.params.id } })
      : 0;
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Takvim notu bulunamadı",
      });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("deleteCalendarNote error:", error);
    return res.status(500).json({
      success: false,
      message: "Takvim notu silinirken hata oluştu",
    });
  }
};
