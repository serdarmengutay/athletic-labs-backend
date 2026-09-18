import { createHmac } from "crypto";

// Plain TCKN values must never reach logs, error messages or response bodies.
// Callers validate, hash once, and work with athlete_id from then on.

const TCKN_PATTERN = /^[1-9][0-9]{10}$/;
const MIN_SECRET_LENGTH = 32;

export class TcknHashSecretError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TcknHashSecretError";
  }
}

export class InvalidTcknError extends Error {
  constructor() {
    super("Geçersiz T.C. Kimlik No");
    this.name = "InvalidTcknError";
  }
}

// Official T.C. Kimlik No rules: 11 digits, first digit non-zero,
// d10 = ((d1+d3+d5+d7+d9)*7 - (d2+d4+d6+d8)) mod 10, d11 = (d1+...+d10) mod 10.
export function isValidTckn(input: unknown): boolean {
  if (typeof input !== "string" || !TCKN_PATTERN.test(input)) {
    return false;
  }

  const digits = Array.from(input, Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const tenthDigit = (((oddSum * 7 - evenSum) % 10) + 10) % 10;
  if (tenthDigit !== digits[9]) {
    return false;
  }

  const firstTenSum = digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0);
  return firstTenSum % 10 === digits[10];
}

export function getTcknHashSecret(): string {
  const secret = process.env.TCKN_HASH_SECRET;
  if (!secret) {
    throw new TcknHashSecretError("TCKN_HASH_SECRET tanımlı değil");
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new TcknHashSecretError(
      `TCKN_HASH_SECRET en az ${MIN_SECRET_LENGTH} karakter olmalı`,
    );
  }
  return secret;
}

// Returns the lowercase hex HMAC-SHA256 digest stored in athletes.tc_no_hash.
export function hashTckn(tckn: string, secret: string = getTcknHashSecret()): string {
  if (!isValidTckn(tckn)) {
    throw new InvalidTcknError();
  }
  return createHmac("sha256", secret).update(tckn, "utf8").digest("hex");
}
