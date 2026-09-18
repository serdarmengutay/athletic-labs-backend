import assert from "node:assert/strict";
import test from "node:test";
import {
  AthleteIdentityInput,
  MERGE_CANDIDATE_REASONS,
  mergeCandidateReason,
  normalizeIdentityInput,
  normalizeNameForMatch,
  parseBirthDate,
  profileMatches,
} from "./athleteIdentityMatching";
import { breakCheckDigit, generateSyntheticTckn } from "./syntheticTckn.testSupport";

// SENTETİK TEST VERİSİ, GERÇEK KİŞİYE AİT DEĞİLDİR.
const TCKN = generateSyntheticTckn();

function input(overrides: Partial<AthleteIdentityInput> = {}): AthleteIdentityInput {
  return {
    tckn: TCKN,
    firstName: "Mehmet Ali",
    lastName: "Şahin",
    birthDate: "2012-04-09",
    gender: "male",
    ...overrides,
  };
}

const identity = { fullName: "Mehmet Ali Şahin", birthDate: "2012-04-09", birthYear: 2012 };

test("folds Turkish letters, case, spaces and punctuation when comparing names", () => {
  const expected = normalizeNameForMatch("Mehmet Ali Şahin");
  assert.equal(normalizeNameForMatch("MEHMET ALİ ŞAHİN"), expected);
  assert.equal(normalizeNameForMatch("mehmetali sahin"), expected);
  assert.equal(normalizeNameForMatch("  Mehmet-Ali   Şahin "), expected);
  assert.equal(normalizeNameForMatch("Işıl Güçlü"), normalizeNameForMatch("ISIL GUCLU"));
});

test("keeps different first names apart", () => {
  assert.notEqual(normalizeNameForMatch("Ada Yılmaz"), normalizeNameForMatch("Ece Yılmaz"));
});

test("accepts only real, non-future birth dates", () => {
  const today = new Date("2026-09-18T00:00:00.000Z");
  assert.equal(parseBirthDate("2012-04-09", today), "2012-04-09");
  assert.equal(parseBirthDate("2012-02-30", today), null);
  assert.equal(parseBirthDate("12-04-2012", today), null);
  assert.equal(parseBirthDate("2027-01-01", today), null);
  assert.equal(parseBirthDate("1899-12-31", today), null);
});

test("normalizes a valid identity and joins the full name", () => {
  const result = normalizeIdentityInput(input({ firstName: "  Mehmet   Ali ", lastName: " Şahin " }));
  assert.deepEqual(result, {
    ok: true,
    value: {
      tckn: TCKN,
      fullName: "Mehmet Ali Şahin",
      birthDate: "2012-04-09",
      birthYear: 2012,
      gender: "male",
    },
  });
});

test("reports which field is invalid", () => {
  const cases: Array<[Partial<AthleteIdentityInput>, string]> = [
    [{ tckn: breakCheckDigit(TCKN, 10) }, "invalid_tckn"],
    [{ firstName: "  " }, "invalid_name"],
    [{ lastName: "123" }, "invalid_name"],
    [{ firstName: "A".repeat(100) }, "invalid_name"],
    [{ birthDate: "2012-13-01" }, "invalid_birth_date"],
    [{ gender: "other" as never }, "invalid_gender"],
  ];
  for (const [override, error] of cases) {
    assert.deepEqual(normalizeIdentityInput(input(override)), { ok: false, error });
  }
});

test("matches a registered TCKN only when name and birth date agree", () => {
  const stored = { full_name: "MEHMET ALİ ŞAHİN", birth_date: "2012-04-09", birth_year: 2012 };
  assert.equal(profileMatches(stored, identity), true);
  assert.equal(profileMatches({ ...stored, full_name: "Ahmet Şahin" }, identity), false);
  assert.equal(profileMatches({ ...stored, birth_date: "2012-04-10" }, identity), false);
});

test("falls back to birth year for old year-only records", () => {
  const stored = { full_name: "Mehmet Ali Şahin", birth_date: null, birth_year: 2012 };
  assert.equal(profileMatches(stored, identity), true);
  assert.equal(profileMatches({ ...stored, birth_year: 2013 }, identity), false);
});

test("scores old records with an exact date above year-only ones", () => {
  assert.equal(
    mergeCandidateReason(
      { full_name: "mehmet ali sahin", birth_date: "2012-04-09", birth_year: 2012 },
      identity,
    ),
    MERGE_CANDIDATE_REASONS.SAME_NAME_AND_BIRTH_DATE,
  );
  assert.equal(
    mergeCandidateReason({ full_name: "Mehmet Ali Şahin", birth_date: null, birth_year: 2012 }, identity),
    MERGE_CANDIDATE_REASONS.SAME_NAME_AND_BIRTH_YEAR,
  );
});

test("does not propose old records with another birth date or year", () => {
  assert.equal(
    mergeCandidateReason(
      { full_name: "Mehmet Ali Şahin", birth_date: "2012-05-09", birth_year: 2012 },
      identity,
    ),
    null,
  );
  assert.equal(
    mergeCandidateReason({ full_name: "Mehmet Ali Şahin", birth_date: null, birth_year: 2011 }, identity),
    null,
  );
});

test("never proposes a twin with the same surname and birth date", () => {
  const twin = { full_name: "Ayşe Şahin", birth_date: "2012-04-09", birth_year: 2012 };
  assert.equal(mergeCandidateReason(twin, { ...identity, fullName: "Zeynep Şahin" }), null);
});
