import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "crypto";
import { QueryTypes, UniqueConstraintError } from "sequelize";
import sequelize from "../../config/database";
import { findAthleteIdByTcNoHash } from "./athleteIdentityRepository";
import { hashTckn } from "./tcknService";
import { generateSyntheticTckns } from "./syntheticTckn.testSupport";
import { dbIntegrationSkipReason } from "./integrationTestGuard.testSupport";

// Runs against a real database, so it is opt-in and refuses the production URL.
// Every row it inserts is a dummy athlete named "Test Sentetik <run> <n>" and is deleted in after().
// SENTETİK TEST VERİSİ, GERÇEK KİŞİYE AİT DEĞİLDİR.

const skipReason = dbIntegrationSkipReason();

const RUN_ID = randomUUID().slice(0, 8);
const [
  DUMMY_A,
  DUMMY_B,
  DUMMY_C,
  DUMMY_D,
  DUMMY_E,
  UNREGISTERED,
  CONCURRENT,
] = generateSyntheticTckns(7);

const insertedIds: string[] = [];
let nextDummyNumber = 1;

async function insertDummyAthlete(tcNoHash: string | null): Promise<string> {
  const id = randomUUID();
  insertedIds.push(id);
  await sequelize.query(
    `INSERT INTO athletes (id, full_name, birth_year, gender, tc_no_hash, created_at, updated_at)
     VALUES (:id, :fullName, 2012, 'male', :tcNoHash, NOW(), NOW())`,
    {
      replacements: {
        id,
        fullName: `Test Sentetik ${RUN_ID} ${nextDummyNumber++}`,
        tcNoHash,
      },
    },
  );
  return id;
}

async function countRowsWithHash(tcNoHash: string): Promise<number> {
  const [row] = await sequelize.query<{ total: string }>(
    "SELECT count(*) AS total FROM athletes WHERE tc_no_hash = :tcNoHash",
    { replacements: { tcNoHash }, type: QueryTypes.SELECT },
  );
  return Number(row.total);
}

const dummyRoster = new Map<string, string>();

before(async () => {
  if (skipReason) {
    return;
  }
  for (const tckn of [DUMMY_A, DUMMY_B, DUMMY_C, DUMMY_D, DUMMY_E]) {
    dummyRoster.set(tckn, await insertDummyAthlete(hashTckn(tckn)));
  }
});

after(async () => {
  if (skipReason) {
    return;
  }
  try {
    if (insertedIds.length > 0) {
      await sequelize.query("DELETE FROM athletes WHERE id IN (:ids)", {
        replacements: { ids: insertedIds },
      });
    }
    await sequelize.query("DELETE FROM athletes WHERE full_name LIKE :pattern", {
      replacements: { pattern: `Test Sentetik ${RUN_ID} %` },
    });
    // Only this run's rows are checked, so other test files running in parallel don't interfere.
    const [left] = await sequelize.query<{ total: string }>(
      "SELECT count(*) AS total FROM athletes WHERE full_name LIKE :pattern",
      { replacements: { pattern: `Test Sentetik ${RUN_ID} %` }, type: QueryTypes.SELECT },
    );
    assert.equal(Number(left.total), 0);
  } finally {
    await sequelize.close();
  }
});

test("finds each dummy athlete by the hash of their TCKN", { skip: skipReason }, async () => {
  for (const [tckn, athleteId] of dummyRoster) {
    assert.equal(await findAthleteIdByTcNoHash(hashTckn(tckn)), athleteId);
  }
});

test("finds nothing for a TCKN that was never registered", { skip: skipReason }, async () => {
  assert.equal(await findAthleteIdByTcNoHash(hashTckn(UNREGISTERED)), null);
});

test("finds nothing for a malformed hash", { skip: skipReason }, async () => {
  assert.equal(await findAthleteIdByTcNoHash("not-a-hash"), null);
  assert.equal(await findAthleteIdByTcNoHash(""), null);
});

test("rejects a second athlete with an already registered TCKN", { skip: skipReason }, async () => {
  const tcNoHash = hashTckn(DUMMY_A);
  await assert.rejects(insertDummyAthlete(tcNoHash), UniqueConstraintError);
  assert.equal(await countRowsWithHash(tcNoHash), 1);
  assert.equal(await findAthleteIdByTcNoHash(tcNoHash), dummyRoster.get(DUMMY_A));
});

test("lets only one of two concurrent registrations with the same TCKN through", { skip: skipReason }, async () => {
  const tcNoHash = hashTckn(CONCURRENT);
  const results = await Promise.allSettled([
    insertDummyAthlete(tcNoHash),
    insertDummyAthlete(tcNoHash),
  ]);

  const fulfilled = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter((result) => result.status === "rejected");
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.ok((rejected[0] as PromiseRejectedResult).reason instanceof UniqueConstraintError);
  assert.equal(await countRowsWithHash(tcNoHash), 1);
  assert.equal(
    await findAthleteIdByTcNoHash(tcNoHash),
    (fulfilled[0] as PromiseFulfilledResult<string>).value,
  );
});

test("still allows any number of athletes without a TCKN", { skip: skipReason }, async () => {
  await insertDummyAthlete(null);
  await insertDummyAthlete(null);
});
