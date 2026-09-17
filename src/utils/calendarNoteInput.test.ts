import assert from "node:assert/strict";
import test from "node:test";
import {
  isUuid,
  isValidDateKey,
  parseCalendarNoteInput,
} from "./calendarNoteInput";

const SESSION_ID = "3f1c2b1e-7a9d-4c1e-9b2a-5d6e7f8a9b0c";

test("accepts only real calendar days", () => {
  assert.equal(isValidDateKey("2026-09-17"), true);
  assert.equal(isValidDateKey("2028-02-29"), true);
  assert.equal(isValidDateKey("2026-02-30"), false);
  assert.equal(isValidDateKey("17.09.2026"), false);
  assert.equal(isValidDateKey(20260917), false);
});

test("recognizes note and session ids", () => {
  assert.equal(isUuid(SESSION_ID), true);
  assert.equal(isUuid("not-a-uuid"), false);
  assert.equal(isUuid(undefined), false);
});

test("requires date and text when creating", () => {
  assert.deepEqual(parseCalendarNoteInput({ text: "Not" }, { partial: false }), {
    ok: false,
    message: "Tarih YYYY-AA-GG biçiminde olmalı",
  });
  assert.equal(
    parseCalendarNoteInput({ noteDate: "2026-09-17", text: "   " }, { partial: false })
      .ok,
    false,
  );
});

test("normalizes a full create payload", () => {
  assert.deepEqual(
    parseCalendarNoteInput(
      {
        noteDate: "2026-09-17",
        noteTime: "09:30",
        testSessionId: SESSION_ID,
        text: "  Tabletleri şarj et  ",
        category: "task",
        isDone: false,
      },
      { partial: false },
    ),
    {
      ok: true,
      value: {
        noteDate: "2026-09-17",
        noteTime: "09:30",
        testSessionId: SESSION_ID,
        text: "Tabletleri şarj et",
        category: "task",
        isDone: false,
      },
    },
  );
});

test("clears optional fields with empty values", () => {
  assert.deepEqual(
    parseCalendarNoteInput({ noteTime: "", testSessionId: null }, { partial: true }),
    { ok: true, value: { noteTime: null, testSessionId: null } },
  );
});

test("rejects malformed optional fields", () => {
  for (const body of [
    { noteTime: "24:00" },
    { noteTime: "9:30" },
    { testSessionId: "s1" },
    { category: "meeting" },
    { isDone: "true" },
    { text: "x".repeat(1001) },
  ]) {
    assert.equal(parseCalendarNoteInput(body, { partial: true }).ok, false, JSON.stringify(body));
  }
});

test("rejects empty updates and non-object bodies", () => {
  assert.equal(parseCalendarNoteInput({}, { partial: true }).ok, false);
  assert.equal(parseCalendarNoteInput([], { partial: true }).ok, false);
  assert.equal(parseCalendarNoteInput(null, { partial: false }).ok, false);
});
