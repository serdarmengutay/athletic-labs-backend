import assert from "node:assert/strict";
import test from "node:test";
import {
  getTcknHashSecret,
  hashTckn,
  InvalidTcknError,
  isValidTckn,
  TcknHashSecretError,
} from "./tcknService";
import {
  breakCheckDigit,
  completeTckn,
  generateSyntheticTckns,
} from "./syntheticTckn.testSupport";

// SENTETİK TEST VERİSİ, GERÇEK KİŞİYE AİT DEĞİLDİR.
const SYNTHETIC_TCKNS = generateSyntheticTckns(50);
const SECRET_A = "a".repeat(64);
const SECRET_B = "b".repeat(64);

test("accepts synthetic numbers that satisfy the official checksum", () => {
  for (const tckn of SYNTHETIC_TCKNS) {
    assert.equal(isValidTckn(tckn), true);
  }
});

test("completes check digits the same way the validator checks them", () => {
  const tckn = completeTckn("123456789");
  assert.equal(tckn.length, 11);
  assert.equal(isValidTckn(tckn), true);
});

test("rejects a wrong 10th or 11th check digit", () => {
  for (const tckn of SYNTHETIC_TCKNS) {
    assert.equal(isValidTckn(breakCheckDigit(tckn, 9)), false);
    assert.equal(isValidTckn(breakCheckDigit(tckn, 10)), false);
  }
});

test("rejects wrong lengths", () => {
  const [tckn] = SYNTHETIC_TCKNS;
  assert.equal(isValidTckn(""), false);
  assert.equal(isValidTckn(tckn.slice(0, 10)), false);
  assert.equal(isValidTckn(`${tckn}0`), false);
});

test("rejects letters, spaces and other non-digit characters", () => {
  const [tckn] = SYNTHETIC_TCKNS;
  assert.equal(isValidTckn(`${tckn.slice(0, 10)}a`), false);
  assert.equal(isValidTckn(`${tckn.slice(0, 5)} ${tckn.slice(6)}`), false);
  assert.equal(isValidTckn(` ${tckn}`), false);
  assert.equal(isValidTckn(`${tckn.slice(0, 10)}-`), false);
  assert.equal(isValidTckn("１２３４５６７８９０１"), false);
});

test("rejects numbers starting with zero", () => {
  assert.equal(isValidTckn("01234567890"), false);
  assert.equal(isValidTckn("00000000000"), false);
});

test("rejects every all-same-digit pattern", () => {
  for (let digit = 0; digit <= 9; digit += 1) {
    assert.equal(isValidTckn(String(digit).repeat(11)), false);
  }
});

test("rejects non-string input", () => {
  const [tckn] = SYNTHETIC_TCKNS;
  assert.equal(isValidTckn(Number(tckn)), false);
  assert.equal(isValidTckn(null), false);
  assert.equal(isValidTckn(undefined), false);
  assert.equal(isValidTckn({}), false);
});

test("hashes the same number to the same 64-char hex digest every time", () => {
  for (const tckn of SYNTHETIC_TCKNS) {
    const first = hashTckn(tckn, SECRET_A);
    assert.match(first, /^[0-9a-f]{64}$/);
    assert.equal(hashTckn(tckn, SECRET_A), first);
  }
});

test("hashes different numbers to different digests", () => {
  const hashes = new Set(SYNTHETIC_TCKNS.map((tckn) => hashTckn(tckn, SECRET_A)));
  assert.equal(hashes.size, SYNTHETIC_TCKNS.length);
});

test("produces a different digest under a different secret", () => {
  const [tckn] = SYNTHETIC_TCKNS;
  assert.notEqual(hashTckn(tckn, SECRET_A), hashTckn(tckn, SECRET_B));
});

test("never hashes an invalid number and keeps it out of the error", () => {
  const invalid = breakCheckDigit(SYNTHETIC_TCKNS[0], 10);
  assert.throws(
    () => hashTckn(invalid, SECRET_A),
    (error: unknown) =>
      error instanceof InvalidTcknError && !String(error.message).includes(invalid),
  );
});

test("reads the secret from TCKN_HASH_SECRET and refuses missing or short values", () => {
  const original = process.env.TCKN_HASH_SECRET;
  try {
    delete process.env.TCKN_HASH_SECRET;
    assert.throws(() => getTcknHashSecret(), TcknHashSecretError);
    assert.throws(() => hashTckn(SYNTHETIC_TCKNS[0]), TcknHashSecretError);

    process.env.TCKN_HASH_SECRET = "too-short";
    assert.throws(() => getTcknHashSecret(), TcknHashSecretError);

    process.env.TCKN_HASH_SECRET = SECRET_A;
    assert.equal(hashTckn(SYNTHETIC_TCKNS[0]), hashTckn(SYNTHETIC_TCKNS[0], SECRET_A));
  } finally {
    if (original === undefined) {
      delete process.env.TCKN_HASH_SECRET;
    } else {
      process.env.TCKN_HASH_SECRET = original;
    }
  }
});
