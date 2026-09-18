import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "crypto";
import { QueryTypes } from "sequelize";
import sequelize from "../../config/database";
import { AthleteIdentityInput, MERGE_CANDIDATE_REASON_TEXT } from "./athleteIdentityMatching";
import { resolveAthleteByTckn, ResolveAthleteResult } from "./athleteIdentityService";
import { hashTckn } from "./tcknService";
import { breakCheckDigit, generateSyntheticTckns } from "./syntheticTckn.testSupport";
import { dbIntegrationSkipReason } from "./integrationTestGuard.testSupport";

// Runs against the Neon dev branch with dummy athletes whose names contain RUN_ID.
// Every athlete it creates (and, by cascade, every merge candidate) is deleted in after().
// SENTETİK TEST VERİSİ, GERÇEK KİŞİYE AİT DEĞİLDİR.

const skipReason = dbIntegrationSkipReason();
const RUN_ID = randomUUID().replace(/[^a-f]/g, "").slice(0, 6) || "abcdef";
const SURNAME = `Sentetik${RUN_ID}`;
const TCKNS = generateSyntheticTckns(12);
let nextTckn = 0;
const takeTckn = () => TCKNS[nextTckn++];

const trackedIds = new Set<string>();

function person(firstName: string, overrides: Partial<AthleteIdentityInput> = {}): AthleteIdentityInput {
  return {
    tckn: takeTckn(),
    firstName,
    lastName: SURNAME,
    birthDate: "2011-06-15",
    gender: "male",
    ...overrides,
  };
}

function track(result: ResolveAthleteResult): ResolveAthleteResult {
  if ("athleteId" in result) {
    trackedIds.add(result.athleteId);
  }
  return result;
}

async function resolve(
  input: AthleteIdentityInput,
  options?: Parameters<typeof resolveAthleteByTckn>[1],
) {
  return track(await resolveAthleteByTckn(input, options));
}

async function count(sql: string, replacements: Record<string, unknown> = {}): Promise<number> {
  const [row] = await sequelize.query<{ total: string }>(sql, {
    replacements,
    type: QueryTypes.SELECT,
  });
  return Number(row.total);
}

// An athlete from the old system: no TCKN, often only a birth year.
async function insertOldRecord(
  firstName: string,
  birthDate: string | null,
  birthYear: number,
  tcNoHash: string | null = null,
): Promise<string> {
  const id = randomUUID();
  trackedIds.add(id);
  await sequelize.query(
    `INSERT INTO athletes (id, full_name, birth_date, birth_year, gender, tc_no_hash, created_at, updated_at)
     VALUES (:id, :fullName, :birthDate, :birthYear, 'male', :tcNoHash, NOW(), NOW())`,
    {
      replacements: { id, fullName: `${firstName} ${SURNAME}`, birthDate, birthYear, tcNoHash },
    },
  );
  return id;
}

async function candidatesFor(newAthleteId: string) {
  return sequelize.query<{ athlete_id_a: string; reason: string; match_score: string; status: string }>(
    `SELECT athlete_id_a, reason, match_score, status
     FROM identity_merge_candidates WHERE athlete_id_b = :newAthleteId ORDER BY match_score DESC`,
    { replacements: { newAthleteId }, type: QueryTypes.SELECT },
  );
}

after(async () => {
  if (skipReason) {
    return;
  }
  try {
    if (trackedIds.size > 0) {
      await sequelize.query("DELETE FROM athletes WHERE id IN (:ids)", {
        replacements: { ids: Array.from(trackedIds) },
      });
    }
    await sequelize.query("DELETE FROM athletes WHERE full_name LIKE :pattern", {
      replacements: { pattern: `% ${SURNAME}` },
    });
    // Only this run's rows are checked, so other test files running in parallel don't interfere.
    assert.equal(
      await count("SELECT count(*) AS total FROM athletes WHERE full_name LIKE :pattern", {
        pattern: `% ${SURNAME}`,
      }),
      0,
    );
    if (trackedIds.size > 0) {
      assert.equal(
        await count(
          `SELECT count(*) AS total FROM identity_merge_candidates
           WHERE athlete_id_a IN (:ids) OR athlete_id_b IN (:ids)`,
          { ids: Array.from(trackedIds) },
        ),
        0,
      );
    }
  } finally {
    await sequelize.close();
  }
});

test("creates a new athlete once and returns the same athlete_id afterwards", { skip: skipReason }, async () => {
  const input = person("Kaan");
  const first = await resolve(input);
  assert.equal(first.status, "created");
  assert.ok("athleteId" in first);

  const second = await resolve(input);
  assert.deepEqual(second, { status: "matched", athleteId: first.athleteId });

  const variant = await resolve({ ...input, firstName: "KAAN", lastName: SURNAME.toUpperCase() });
  assert.deepEqual(variant, { status: "matched", athleteId: first.athleteId });

  assert.equal(
    await count("SELECT count(*) AS total FROM athletes WHERE tc_no_hash = :hash", {
      hash: hashTckn(input.tckn),
    }),
    1,
  );
});

test("refuses a known TCKN with another name or birth date and returns no athlete_id", { skip: skipReason }, async () => {
  const input = person("Emre");
  assert.equal((await resolve(input)).status, "created");

  assert.deepEqual(await resolve({ ...input, firstName: "Burak" }), { status: "conflict" });
  assert.deepEqual(await resolve({ ...input, birthDate: "2011-06-16" }), { status: "conflict" });
});

test("gives every concurrent request for a new TCKN the same athlete_id", { skip: skipReason }, async () => {
  const input = person("Deniz");
  const results = await Promise.all(Array.from({ length: 6 }, () => resolve(input)));

  const ids = new Set(results.map((result) => ("athleteId" in result ? result.athleteId : null)));
  assert.equal(ids.size, 1);
  assert.ok(!ids.has(null));
  assert.equal(results.filter((result) => result.status === "created").length, 1);
  assert.equal(results.filter((result) => result.status === "matched").length, 5);
  assert.equal(
    await count("SELECT count(*) AS total FROM athletes WHERE tc_no_hash = :hash", {
      hash: hashTckn(input.tckn),
    }),
    1,
  );
});

test("queues old records with the same name for human review without merging", { skip: skipReason }, async () => {
  const exactDate = await insertOldRecord("Arda", "2011-06-15", 2011);
  const yearOnly = await insertOldRecord("Arda", null, 2011);
  const otherYear = await insertOldRecord("Arda", null, 2010);
  const twin = await insertOldRecord("Efe", "2011-06-15", 2011);
  const alreadyHasTckn = await insertOldRecord("Arda", null, 2011, hashTckn(takeTckn()));

  const result = await resolve(person("Arda"));
  assert.equal(result.status, "created");
  assert.ok(result.status === "created");
  assert.equal(result.mergeCandidateCount, 2);

  const candidates = await candidatesFor(result.athleteId);
  assert.deepEqual(
    candidates.map((candidate) => [candidate.athlete_id_a, candidate.reason, Number(candidate.match_score), candidate.status]),
    [
      [exactDate, MERGE_CANDIDATE_REASON_TEXT.same_name_and_birth_date, 90, "pending"],
      [yearOnly, MERGE_CANDIDATE_REASON_TEXT.same_name_and_birth_year, 60, "pending"],
    ],
  );

  const proposedIds = candidates.map((candidate) => candidate.athlete_id_a);
  for (const untouched of [otherYear, twin, alreadyHasTckn]) {
    assert.ok(!proposedIds.includes(untouched));
  }
  // Nothing merged: the old records still exist without a TCKN.
  assert.equal(
    await count("SELECT count(*) AS total FROM athletes WHERE id IN (:ids) AND tc_no_hash IS NULL", {
      ids: [exactDate, yearOnly],
    }),
    2,
  );
});

test("does not create anything when the identity check rejects the person", { skip: skipReason }, async () => {
  const rejected = person("Mert");
  assert.deepEqual(await resolve(rejected, { verifier: async () => false }), {
    status: "verification_failed",
  });
  assert.equal(
    await count("SELECT count(*) AS total FROM athletes WHERE tc_no_hash = :hash", {
      hash: hashTckn(rejected.tckn),
    }),
    0,
  );

  const accepted = person("Can");
  let calls = 0;
  const verifier = async () => {
    calls += 1;
    return true;
  };
  assert.equal((await resolve(accepted, { verifier })).status, "created");
  assert.equal((await resolve(accepted, { verifier })).status, "matched");
  assert.equal(calls, 1, "a known TCKN is matched locally without a second check");
});

test("rejects invalid input before touching the database", { skip: skipReason }, async () => {
  const before = await count("SELECT count(*) AS total FROM athletes");
  assert.deepEqual(await resolve(person("Onur", { tckn: breakCheckDigit(takeTckn(), 10) })), {
    status: "invalid_input",
    error: "invalid_tckn",
  });
  assert.deepEqual(await resolve(person("Onur", { birthDate: "2011-02-30" })), {
    status: "invalid_input",
    error: "invalid_birth_date",
  });
  assert.equal(await count("SELECT count(*) AS total FROM athletes"), before);
});
