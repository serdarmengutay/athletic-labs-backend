export const CALENDAR_NOTE_CATEGORIES = [
  "note",
  "task",
  "logistics",
  "important",
] as const;

export type CalendarNoteCategory = (typeof CALENDAR_NOTE_CATEGORIES)[number];

export const MAX_CALENDAR_NOTE_LENGTH = 1000;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_PATTERN.test(value);

export interface CalendarNoteInput {
  noteDate?: string;
  noteTime?: string | null;
  testSessionId?: string | null;
  text?: string;
  category?: CalendarNoteCategory;
  isDone?: boolean;
}

export type CalendarNoteInputResult =
  | { ok: true; value: CalendarNoteInput }
  | { ok: false; message: string };

/** YYYY-MM-DD biçiminde ve takvimde gerçekten var olan bir gün mü? */
export const isValidDateKey = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const isValidTime = (value: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return Boolean(match && Number(match[1]) < 24 && Number(match[2]) < 60);
};

/**
 * İstek gövdesini doğrular. `partial` güncellemede yalnızca gönderilen
 * alanları kontrol eder; oluşturmada tarih ve metin zorunludur.
 */
export const parseCalendarNoteInput = (
  body: unknown,
  { partial }: { partial: boolean },
): CalendarNoteInputResult => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Geçersiz istek gövdesi" };
  }
  const input = body as Record<string, unknown>;
  const value: CalendarNoteInput = {};

  if (input.noteDate !== undefined || !partial) {
    if (!isValidDateKey(input.noteDate)) {
      return { ok: false, message: "Tarih YYYY-AA-GG biçiminde olmalı" };
    }
    value.noteDate = input.noteDate;
  }

  if (input.text !== undefined || !partial) {
    const text = typeof input.text === "string" ? input.text.trim() : "";
    if (!text) {
      return { ok: false, message: "Not metni boş olamaz" };
    }
    if (text.length > MAX_CALENDAR_NOTE_LENGTH) {
      return {
        ok: false,
        message: `Not en fazla ${MAX_CALENDAR_NOTE_LENGTH} karakter olabilir`,
      };
    }
    value.text = text;
  }

  if (input.noteTime !== undefined) {
    if (input.noteTime === null || input.noteTime === "") {
      value.noteTime = null;
    } else if (typeof input.noteTime === "string" && isValidTime(input.noteTime)) {
      value.noteTime = input.noteTime;
    } else {
      return { ok: false, message: "Saat SS:DD biçiminde olmalı" };
    }
  }

  if (input.testSessionId !== undefined) {
    if (input.testSessionId === null || input.testSessionId === "") {
      value.testSessionId = null;
    } else if (isUuid(input.testSessionId)) {
      value.testSessionId = input.testSessionId;
    } else {
      return { ok: false, message: "Geçersiz test oturumu" };
    }
  }

  if (input.category !== undefined) {
    if (
      typeof input.category !== "string" ||
      !(CALENDAR_NOTE_CATEGORIES as readonly string[]).includes(input.category)
    ) {
      return { ok: false, message: "Geçersiz not kategorisi" };
    }
    value.category = input.category as CalendarNoteCategory;
  }

  if (input.isDone !== undefined) {
    if (typeof input.isDone !== "boolean") {
      return { ok: false, message: "Tamamlandı bilgisi true/false olmalı" };
    }
    value.isDone = input.isDone;
  }

  if (partial && Object.keys(value).length === 0) {
    return { ok: false, message: "Güncellenecek alan yok" };
  }

  return { ok: true, value };
};
