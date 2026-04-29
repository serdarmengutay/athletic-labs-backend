export const ATHLETE_GENDERS = {
  MALE: "male",
  FEMALE: "female",
} as const;

export type AthleteGender =
  (typeof ATHLETE_GENDERS)[keyof typeof ATHLETE_GENDERS];

export function normalizeGender(value: unknown): AthleteGender {
  if (typeof value !== "string") return ATHLETE_GENDERS.MALE;

  const normalized = value.trim().toLowerCase();

  if (normalized === ATHLETE_GENDERS.FEMALE) {
    return ATHLETE_GENDERS.FEMALE;
  }

  return ATHLETE_GENDERS.MALE;
}
