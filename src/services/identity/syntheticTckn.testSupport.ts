import { randomInt } from "crypto";

// SENTETİK TEST VERİSİ, GERÇEK KİŞİYE AİT DEĞİLDİR.
// Numbers are built by running the official checksum forwards from random first nine
// digits. They are only used in tests, kept in memory, and never stored in plain form.

export function completeTckn(firstNineDigits: string): string {
  if (!/^[1-9][0-9]{8}$/.test(firstNineDigits)) {
    throw new Error("İlk 9 hane 0 ile başlamayan 9 rakam olmalı");
  }

  const digits = Array.from(firstNineDigits, Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const tenthDigit = (((oddSum * 7 - evenSum) % 10) + 10) % 10;
  const eleventhDigit = (digits.reduce((sum, digit) => sum + digit, 0) + tenthDigit) % 10;

  return `${firstNineDigits}${tenthDigit}${eleventhDigit}`;
}

export function generateSyntheticTckn(): string {
  const firstDigit = randomInt(1, 10);
  const rest = Array.from({ length: 8 }, () => randomInt(0, 10)).join("");
  return completeTckn(`${firstDigit}${rest}`);
}

export function generateSyntheticTckns(count: number): string[] {
  const values = new Set<string>();
  while (values.size < count) {
    values.add(generateSyntheticTckn());
  }
  return Array.from(values);
}

// Same number with one checksum digit changed, so it must be rejected.
export function breakCheckDigit(tckn: string, position: 9 | 10): string {
  const digits = Array.from(tckn);
  digits[position] = String((Number(digits[position]) + 1) % 10);
  return digits.join("");
}
