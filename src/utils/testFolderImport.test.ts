import assert from "node:assert/strict";
import test from "node:test";
import {
  athleteNameKey,
  computeMembershipEndDates,
  resolveFolderMapping,
  validateFolderMapping,
} from "./testFolderImport";

const entries = validateFolderMapping([
  { path: "27_28_EYLUL_TEST", club: "Belirsiz", testDate: "2025-09-27" },
  { path: "27_28_EYLUL_TEST/ALTAI GRUPLAR", club: "Mudanya Altai", team: "2016", testDate: "2025-09-27" },
  { path: "VOLEYBOL VERILERI", club: "Bursa Fenerbahçe Voleybol Kız Spor Okulu", testDate: "2026-05-10", defaultGender: "female" },
]);

test("uses the most specific mapping for a file", () => {
  assert.deepEqual(resolveFolderMapping("27_28_EYLUL_TEST/ALTAI GRUPLAR/ALTAI_2016.xlsx", entries), {
    club: "Mudanya Altai",
    team: "2016",
    testDate: "2025-09-27",
    testDateEstimated: false,
    defaultGender: "male",
  });
});

test("defaults the team to Genel and keeps the mapped gender", () => {
  const resolved = resolveFolderMapping("VOLEYBOL VERILERI/FB/x.xlsx", entries);
  assert.equal(resolved?.team, "Genel");
  assert.equal(resolved?.defaultGender, "female");
});

test("returns null for unmapped files instead of guessing a club", () => {
  assert.equal(resolveFolderMapping("YENI_KLASOR/a.xlsx", entries), null);
});

test("does not match a sibling folder that shares a prefix", () => {
  assert.equal(resolveFolderMapping("VOLEYBOL VERILERI_ESKI/a.xlsx", entries), null);
});

test("matches decomposed and composed Turkish characters the same way", () => {
  const decomposed = "GÜLBAHÇESPOR/a.xlsx";
  const mapping = validateFolderMapping([{ path: "GÜLBAHÇESPOR", club: "Gülbahçespor", testDate: "2026-01-04" }]);
  assert.equal(resolveFolderMapping(decomposed, mapping)?.club, "Gülbahçespor");
});

test("rejects mapping entries without club or valid date", () => {
  assert.throws(() => validateFolderMapping([{ path: "A", testDate: "2025-01-01" }]), /club/);
  assert.throws(() => validateFolderMapping([{ path: "A", club: "X", testDate: "01.01.2025" }]), /testDate/);
  assert.throws(() => validateFolderMapping([]), /boş olmayan/);
});

test("builds Turkish-aware name keys", () => {
  assert.equal(athleteNameKey("  ömer   fiskiye "), "ÖMER FİSKİYE");
});

test("closes older memberships at the next start date and keeps the latest open", () => {
  const changes = computeMembershipEndDates([
    { id: "b", startDate: "2026-09-05", endDate: null },
    { id: "a", startDate: "2025-10-16", endDate: null },
  ]);
  assert.deepEqual(changes, [{ id: "a", endDate: "2026-09-05" }]);
});

test("reopens nothing when periods are already consistent", () => {
  assert.deepEqual(
    computeMembershipEndDates([
      { id: "a", startDate: "2025-10-16", endDate: "2026-09-05" },
      { id: "b", startDate: "2026-09-05", endDate: null },
    ]),
    [],
  );
});
