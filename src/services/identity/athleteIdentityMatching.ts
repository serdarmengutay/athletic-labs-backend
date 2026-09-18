import { ATHLETE_GENDERS, AthleteGender } from "../../config/gender";
import { isValidTckn } from "./tcknService";

// Pure rules for deciding whether two athlete profiles describe the same person.
// No database access here so every rule is unit-testable.

export interface AthleteIdentityInput {
  tckn: string;
  firstName: string;
  lastName: string;
  birthDate: string; // YYYY-MM-DD
  gender: AthleteGender;
}

export interface NormalizedAthleteIdentity {
  tckn: string;
  fullName: string;
  birthDate: string;
  birthYear: number;
  gender: AthleteGender;
}

export type IdentityInputError =
  | "invalid_tckn"
  | "invalid_name"
  | "invalid_birth_date"
  | "invalid_gender";

export interface StoredAthleteProfile {
  full_name: string;
  birth_date: string | null; // YYYY-MM-DD
  birth_year: number;
}

export const MERGE_CANDIDATE_REASONS = {
  SAME_NAME_AND_BIRTH_DATE: "same_name_and_birth_date",
  SAME_NAME_AND_BIRTH_YEAR: "same_name_and_birth_year",
} as const;

export type MergeCandidateReason =
  (typeof MERGE_CANDIDATE_REASONS)[keyof typeof MERGE_CANDIDATE_REASONS];

// Stored in identity_merge_candidates.reason, which the panel shows to the reviewer as-is.
export const MERGE_CANDIDATE_REASON_TEXT: Record<MergeCandidateReason, string> = {
  same_name_and_birth_date:
    "Aynı ad-soyad ve aynı doğum tarihi; yeni kayıt TCKN ile açıldı, eski kayıtta TCKN yok.",
  same_name_and_birth_year:
    "Aynı ad-soyad ve aynı doğum yılı (eski kayıtta sadece yıl var); yeni kayıt TCKN ile açıldı.",
};

// An exact date is stronger evidence than a year-only record from the old system.
export const MERGE_CANDIDATE_SCORES: Record<MergeCandidateReason, number> = {
  same_name_and_birth_date: 90,
  same_name_and_birth_year: 60,
};

const MAX_FULL_NAME_LENGTH = 100;

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

// Folds case, Turkish letters, accents, spaces and punctuation so that
// "Mehmet Ali ŞAHİN", "mehmetali sahin" and "Mehmet-Ali Şahin" compare equal.
// First names still differ between twins, so they never collapse into one key.
export function normalizeNameForMatch(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

export function parseBirthDate(value: string, today: Date = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }
  if (value > today.toISOString().slice(0, 10) || date.getUTCFullYear() < 1900) {
    return null;
  }
  return value;
}

export function normalizeIdentityInput(
  input: AthleteIdentityInput,
): { ok: true; value: NormalizedAthleteIdentity } | { ok: false; error: IdentityInputError } {
  if (!isValidTckn(input.tckn)) {
    return { ok: false, error: "invalid_tckn" };
  }

  const firstName = collapseWhitespace(String(input.firstName ?? ""));
  const lastName = collapseWhitespace(String(input.lastName ?? ""));
  const fullName = `${firstName} ${lastName}`;
  if (
    !normalizeNameForMatch(firstName) ||
    !normalizeNameForMatch(lastName) ||
    fullName.length > MAX_FULL_NAME_LENGTH
  ) {
    return { ok: false, error: "invalid_name" };
  }

  const birthDate = parseBirthDate(String(input.birthDate ?? "").trim());
  if (!birthDate) {
    return { ok: false, error: "invalid_birth_date" };
  }

  if (input.gender !== ATHLETE_GENDERS.MALE && input.gender !== ATHLETE_GENDERS.FEMALE) {
    return { ok: false, error: "invalid_gender" };
  }

  return {
    ok: true,
    value: {
      tckn: input.tckn,
      fullName,
      birthDate,
      birthYear: Number(birthDate.slice(0, 4)),
      gender: input.gender,
    },
  };
}

function sameBirth(stored: StoredAthleteProfile, birthDate: string, birthYear: number): boolean {
  return stored.birth_date ? stored.birth_date === birthDate : stored.birth_year === birthYear;
}

// Used when a TCKN is already registered: the name and birth date must also agree,
// otherwise someone typed another person's TCKN and must not be linked to that athlete.
export function profileMatches(
  stored: StoredAthleteProfile,
  identity: Pick<NormalizedAthleteIdentity, "fullName" | "birthDate" | "birthYear">,
): boolean {
  return (
    normalizeNameForMatch(stored.full_name) === normalizeNameForMatch(identity.fullName) &&
    sameBirth(stored, identity.birthDate, identity.birthYear)
  );
}

// Used against old records without a TCKN. Only the same full name counts,
// so twins (same surname and birth date, different first name) never match.
export function mergeCandidateReason(
  stored: StoredAthleteProfile,
  identity: Pick<NormalizedAthleteIdentity, "fullName" | "birthDate" | "birthYear">,
): MergeCandidateReason | null {
  if (normalizeNameForMatch(stored.full_name) !== normalizeNameForMatch(identity.fullName)) {
    return null;
  }
  if (stored.birth_date) {
    return stored.birth_date === identity.birthDate
      ? MERGE_CANDIDATE_REASONS.SAME_NAME_AND_BIRTH_DATE
      : null;
  }
  return stored.birth_year === identity.birthYear
    ? MERGE_CANDIDATE_REASONS.SAME_NAME_AND_BIRTH_YEAR
    : null;
}
