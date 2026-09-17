import path from "path";

// Club, team and test date come from a human-written mapping file.
// Club names are never derived from folder or file names.
export interface FolderMappingEntry {
  path: string;
  club: string;
  team?: string;
  testDate: string;
  testDateEstimated?: boolean;
  defaultGender?: "male" | "female";
}

export interface ResolvedFolderMapping {
  club: string;
  team: string;
  testDate: string;
  testDateEstimated: boolean;
  defaultGender: "male" | "female";
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeRelativePath(value: string): string {
  return value
    .normalize("NFC")
    .split(/[\\/]+/)
    .filter(Boolean)
    .join("/");
}

export function validateFolderMapping(entries: unknown): FolderMappingEntry[] {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("Eşleme dosyası boş olmayan bir dizi olmalı");
  }

  return entries.map((entry, index) => {
    const item = entry as Partial<FolderMappingEntry>;
    const label = `Eşleme #${index + 1}`;

    if (!item.path || typeof item.path !== "string") {
      throw new Error(`${label}: "path" zorunlu`);
    }
    if (!item.club || typeof item.club !== "string" || !item.club.trim()) {
      throw new Error(`${label}: "club" zorunlu`);
    }
    if (!item.testDate || !DATE_PATTERN.test(item.testDate)) {
      throw new Error(`${label}: "testDate" YYYY-AA-GG biçiminde zorunlu`);
    }
    if (item.defaultGender && !["male", "female"].includes(item.defaultGender)) {
      throw new Error(`${label}: "defaultGender" male veya female olmalı`);
    }

    return {
      path: normalizeRelativePath(item.path),
      club: item.club.normalize("NFC").trim(),
      team: item.team?.normalize("NFC").trim() || undefined,
      testDate: item.testDate,
      testDateEstimated: item.testDateEstimated,
      defaultGender: item.defaultGender,
    };
  });
}

// The most specific (longest) matching path prefix wins.
export function resolveFolderMapping(
  relativeFilePath: string,
  entries: FolderMappingEntry[],
): ResolvedFolderMapping | null {
  const filePath = normalizeRelativePath(relativeFilePath);
  const match = entries
    .filter((entry) => filePath === entry.path || filePath.startsWith(`${entry.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];

  if (!match) return null;

  return {
    club: match.club,
    team: match.team || "Genel",
    testDate: match.testDate,
    testDateEstimated: match.testDateEstimated ?? false,
    defaultGender: match.defaultGender ?? "male",
  };
}

export function normalizeAthleteName(value: string): string {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

export function athleteNameKey(value: string): string {
  return normalizeAthleteName(value).toLocaleUpperCase("tr-TR");
}

export function relativeToRoot(rootDir: string, filePath: string): string {
  return normalizeRelativePath(path.relative(path.resolve(rootDir), path.resolve(filePath)));
}

export interface MembershipPeriod {
  id: string;
  startDate: string;
  endDate: string | null;
}

// Memberships are closed, never overwritten: each one ends when the next one starts,
// and only the latest stays open. Returns the rows whose end_date must change.
export function computeMembershipEndDates(
  memberships: MembershipPeriod[],
): Array<{ id: string; endDate: string | null }> {
  const sorted = [...memberships].sort((a, b) =>
    a.startDate === b.startDate ? a.id.localeCompare(b.id) : a.startDate.localeCompare(b.startDate),
  );

  return sorted
    .map((membership, index) => ({
      id: membership.id,
      endDate: index < sorted.length - 1 ? sorted[index + 1].startDate : null,
      previous: membership.endDate,
    }))
    .filter((membership) => membership.endDate !== membership.previous)
    .map(({ id, endDate }) => ({ id, endDate }));
}
