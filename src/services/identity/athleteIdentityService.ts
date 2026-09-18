import { UniqueConstraintError } from "sequelize";
import sequelize from "../../config/database";
import Athlete from "../../models/Athlete";
import {
  AthleteIdentityInput,
  IdentityInputError,
  MERGE_CANDIDATE_SCORES,
  mergeCandidateReason,
  NormalizedAthleteIdentity,
  normalizeIdentityInput,
  profileMatches,
} from "./athleteIdentityMatching";
import {
  findAthleteIdentityByTcNoHash,
  findAthletesWithoutTcknByBirthYear,
  insertMergeCandidates,
  MergeCandidateInsert,
} from "./athleteIdentityRepository";
import { hashTckn } from "./tcknService";

// Official identity check (NVİ KPS) plugs in here once membership is in place.
// It only runs before a new athlete is created; known TCKNs are matched locally.
export type IdentityVerifier = (identity: NormalizedAthleteIdentity) => Promise<boolean>;

export type ResolveAthleteResult =
  | { status: "matched"; athleteId: string }
  | { status: "created"; athleteId: string; mergeCandidateCount: number }
  // The TCKN is registered to a person with another name or birth date. No athlete_id
  // is returned so a mistyped or borrowed TCKN never exposes someone else's profile.
  | { status: "conflict" }
  | { status: "verification_failed" }
  | { status: "invalid_input"; error: IdentityInputError };

export interface ResolveAthleteOptions {
  verifier?: IdentityVerifier;
}

function resolveKnownAthlete(
  stored: Awaited<ReturnType<typeof findAthleteIdentityByTcNoHash>>,
  identity: NormalizedAthleteIdentity,
): ResolveAthleteResult | null {
  if (!stored) {
    return null;
  }
  return profileMatches(stored, identity)
    ? { status: "matched", athleteId: stored.id }
    : { status: "conflict" };
}

async function createAthleteWithCandidates(
  identity: NormalizedAthleteIdentity,
  tcNoHash: string,
): Promise<{ athleteId: string; mergeCandidateCount: number }> {
  return sequelize.transaction(async (transaction) => {
    const athlete = await Athlete.create(
      {
        full_name: identity.fullName,
        birth_date: new Date(`${identity.birthDate}T00:00:00.000Z`),
        birth_year: identity.birthYear,
        gender: identity.gender,
        tc_no_hash: tcNoHash,
      },
      { transaction },
    );

    const oldRecords = await findAthletesWithoutTcknByBirthYear(identity.birthYear, {
      transaction,
      excludeAthleteId: athlete.id,
    });

    const candidates: MergeCandidateInsert[] = [];
    for (const record of oldRecords) {
      const reason = mergeCandidateReason(record, identity);
      if (reason) {
        candidates.push({
          existingAthleteId: record.id,
          newAthleteId: athlete.id,
          reason,
          matchScore: MERGE_CANDIDATE_SCORES[reason],
        });
      }
    }
    await insertMergeCandidates(candidates, { transaction });

    return { athleteId: athlete.id, mergeCandidateCount: candidates.length };
  });
}

// Same TCKN + same name + same birth date always resolves to the same athlete_id,
// including when several requests for a new TCKN arrive at the same moment.
export async function resolveAthleteByTckn(
  input: AthleteIdentityInput,
  options: ResolveAthleteOptions = {},
): Promise<ResolveAthleteResult> {
  const normalized = normalizeIdentityInput(input);
  if (!normalized.ok) {
    return { status: "invalid_input", error: normalized.error };
  }
  const identity = normalized.value;
  const tcNoHash = hashTckn(identity.tckn);

  const known = resolveKnownAthlete(await findAthleteIdentityByTcNoHash(tcNoHash), identity);
  if (known) {
    return known;
  }

  if (options.verifier && !(await options.verifier(identity))) {
    return { status: "verification_failed" };
  }

  try {
    const created = await createAthleteWithCandidates(identity, tcNoHash);
    return { status: "created", ...created };
  } catch (error) {
    // A concurrent request registered this TCKN first; answer with that athlete.
    if (error instanceof UniqueConstraintError) {
      const winner = resolveKnownAthlete(await findAthleteIdentityByTcNoHash(tcNoHash), identity);
      if (winner) {
        return winner;
      }
    }
    throw error;
  }
}
