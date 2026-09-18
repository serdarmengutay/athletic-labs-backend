import { QueryTypes, Transaction } from "sequelize";
import sequelize from "../../config/database";
import {
  MERGE_CANDIDATE_REASON_TEXT,
  MergeCandidateReason,
  StoredAthleteProfile,
} from "./athleteIdentityMatching";

const TC_NO_HASH_PATTERN = /^[0-9a-f]{64}$/;

export interface AthleteIdentityRow extends StoredAthleteProfile {
  id: string;
}

// Returns only the athlete_id; the hash itself is not handed back to callers.
export async function findAthleteIdByTcNoHash(
  tcNoHash: string,
  options: { transaction?: Transaction } = {},
): Promise<string | null> {
  const row = await findAthleteIdentityByTcNoHash(tcNoHash, options);
  return row?.id ?? null;
}

export async function findAthleteIdentityByTcNoHash(
  tcNoHash: string,
  options: { transaction?: Transaction } = {},
): Promise<AthleteIdentityRow | null> {
  if (!TC_NO_HASH_PATTERN.test(tcNoHash)) {
    return null;
  }

  const rows = await sequelize.query<AthleteIdentityRow>(
    `SELECT id, full_name, to_char(birth_date, 'YYYY-MM-DD') AS birth_date, birth_year
     FROM athletes WHERE tc_no_hash = :tcNoHash LIMIT 1`,
    {
      replacements: { tcNoHash },
      type: QueryTypes.SELECT,
      transaction: options.transaction,
    },
  );

  return rows[0] ?? null;
}

// Old records never had a TCKN, so they are the only ones that can be the same
// person under another profile. Name comparison happens in athleteIdentityMatching.
export async function findAthletesWithoutTcknByBirthYear(
  birthYear: number,
  options: { transaction?: Transaction; excludeAthleteId?: string } = {},
): Promise<AthleteIdentityRow[]> {
  return sequelize.query<AthleteIdentityRow>(
    `SELECT id, full_name, to_char(birth_date, 'YYYY-MM-DD') AS birth_date, birth_year
     FROM athletes
     WHERE birth_year = :birthYear
       AND tc_no_hash IS NULL
       AND id <> :excludeAthleteId`,
    {
      replacements: {
        birthYear,
        excludeAthleteId: options.excludeAthleteId ?? "00000000-0000-0000-0000-000000000000",
      },
      type: QueryTypes.SELECT,
      transaction: options.transaction,
    },
  );
}

export interface MergeCandidateInsert {
  existingAthleteId: string;
  newAthleteId: string;
  reason: MergeCandidateReason;
  matchScore: number;
}

// Queues possible duplicates for a human decision. Nothing is merged here.
export async function insertMergeCandidates(
  candidates: MergeCandidateInsert[],
  options: { transaction?: Transaction } = {},
): Promise<void> {
  for (const candidate of candidates) {
    await sequelize.query(
      `INSERT INTO identity_merge_candidates
         (id, athlete_id_a, athlete_id_b, reason, match_score, status, created_at, updated_at)
       VALUES (gen_random_uuid(), :existingAthleteId, :newAthleteId, :reason, :matchScore, 'pending', NOW(), NOW())
       ON CONFLICT (athlete_id_a, athlete_id_b) DO NOTHING`,
      {
        replacements: {
          existingAthleteId: candidate.existingAthleteId,
          newAthleteId: candidate.newAthleteId,
          reason: MERGE_CANDIDATE_REASON_TEXT[candidate.reason],
          matchScore: candidate.matchScore,
        },
        transaction: options.transaction,
      },
    );
  }
}
