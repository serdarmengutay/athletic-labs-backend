import { createHash } from "crypto";
import path from "path";
import {
  calculateBMI,
  calculateFatigueIndex,
} from "../services/calculationService";

const HEADER_MAP: Record<string, string> = {
  "ADI SOYADI": "athleteName",
  "AD SOYAD": "athleteName",
  İSİM: "athleteName",
  "SPORCU ADI": "athleteName",
  "DOĞUM TARİHİ": "birthYear",
  "DOGUM TARIHI": "birthYear",
  "DOĞUM YILI": "birthYear",
  YAŞ: "birthYear",
  CINSIYET: "gender",
  CİNSİYET: "gender",
  GENDER: "gender",
  BOY: "height",
  "BOY (CM)": "height",
  KILO: "weight",
  KİLO: "weight",
  AĞIRLIK: "weight",
  AGIRLIK: "weight",
  ESNEKLİK: "flexibility",
  ESNEKLIK: "flexibility",
  "30 METRE": "sprint30",
  "30M": "sprint30",
  "30 M": "sprint30",
  "İKİNCİ 30 METRE": "sprint30_2",
  "IKINCI 30 METRE": "sprint30_2",
  "2. 30 METRE": "sprint30_2",
  "30 METRE 2": "sprint30_2",
  ÇEVİKLİK: "agility",
  CEVIKLIK: "agility",
  "DİKEY SIÇRAMA": "verticalJump",
  "DIKEY SICRAMA": "verticalJump",
  SIÇRAMA: "verticalJump",
  FFMI: "ffmi",
  PAS: "passCount",
  "PAS SAYISI": "passCount",
};

export interface ParsedHistoricalRow {
  athleteName?: string;
  birthYear?: number;
  gender?: string;
  height?: number;
  weight?: number;
  flexibility?: number;
  sprint30?: number;
  sprint30_2?: number;
  agility?: number;
  verticalJump?: number;
  passCount?: number;
  ffmi?: number;
  bmi?: number;
  fatigueIndex?: number;
}

export interface ParsedWorkbookSheet {
  sheetName: string;
  rows: ParsedHistoricalRow[];
}

export function normalizeHeader(header: string): string {
  return header.toString().trim().toUpperCase().replace(/\s+/g, " ");
}

export function normalizeFileName(filePath: string): string {
  return path.basename(filePath).normalize("NFKC").toUpperCase();
}

export function shouldSkipImportFile(filePath: string): boolean {
  const normalizedName = normalizeFileName(filePath);

  if (normalizedName.startsWith("~$")) return true;
  if (normalizedName.includes("ANTRENOR")) return true;
  if (normalizedName.includes("RAPOR")) return true;

  return false;
}

export function parseBirthYear(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    if (value >= 1900 && value <= 2100) return Math.floor(value);
    if (value > 30000 && value < 50000) {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.getFullYear();
    }
    return null;
  }

  if (value instanceof Date) {
    return value.getFullYear();
  }

  const stringValue = String(value).trim();
  const patterns = [
    /(\d{4})[-\/\.]\d{1,2}[-\/\.]\d{1,2}/,
    /\d{1,2}[-\/\.]\d{1,2}[-\/\.](\d{4})/,
  ];

  for (const pattern of patterns) {
    const match = stringValue.match(pattern);
    if (match?.[1]) {
      const year = Number.parseInt(match[1], 10);
      if (year >= 1900 && year <= 2100) return year;
    }
  }

  const directYear = Number.parseInt(stringValue, 10);
  if (!Number.isNaN(directYear) && directYear >= 1900 && directYear <= 2100) {
    return directYear;
  }

  return null;
}

function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;

  const normalized =
    typeof value === "string" ? value.replace(",", ".").trim() : value;
  const parsed = Number.parseFloat(String(normalized));

  return Number.isFinite(parsed) ? parsed : undefined;
}

export function mapExcelRow(rawRow: Record<string, unknown>): ParsedHistoricalRow {
  const mapped: ParsedHistoricalRow = {};

  for (const [rawHeader, value] of Object.entries(rawRow)) {
    const internalField = HEADER_MAP[normalizeHeader(rawHeader)];
    if (!internalField) continue;

    switch (internalField) {
      case "athleteName":
        mapped.athleteName = String(value).trim();
        break;
      case "birthYear":
        mapped.birthYear = parseBirthYear(value) ?? undefined;
        break;
      case "gender":
        mapped.gender = String(value).trim().toLowerCase();
        break;
      case "height":
        mapped.height = parseNumber(value);
        break;
      case "weight":
        mapped.weight = parseNumber(value);
        break;
      case "flexibility":
        mapped.flexibility = parseNumber(value);
        break;
      case "sprint30":
        mapped.sprint30 = parseNumber(value);
        break;
      case "sprint30_2":
        mapped.sprint30_2 = parseNumber(value);
        break;
      case "agility":
        mapped.agility = parseNumber(value);
        break;
      case "verticalJump":
        mapped.verticalJump = parseNumber(value);
        break;
      case "passCount":
        mapped.passCount = parseNumber(value);
        break;
      case "ffmi":
        mapped.ffmi = parseNumber(value);
        break;
    }
  }

  if (mapped.height !== undefined && mapped.weight !== undefined) {
    mapped.bmi = calculateBMI(mapped.height, mapped.weight);
  }

  if (mapped.sprint30 !== undefined && mapped.sprint30_2 !== undefined) {
    mapped.fatigueIndex = calculateFatigueIndex(
      mapped.sprint30,
      mapped.sprint30_2,
    );
  }

  return mapped;
}

export function isLikelyHistoricalTestSheet(rows: ParsedHistoricalRow[]): boolean {
  const qualifyingRows = rows.filter((row) => {
    const metricCount = [
      row.height,
      row.weight,
      row.flexibility,
      row.sprint30,
      row.sprint30_2,
      row.agility,
      row.verticalJump,
      row.passCount,
      row.ffmi,
    ].filter((value) => value !== undefined).length;

    return Boolean(row.athleteName && row.birthYear && metricCount >= 2);
  });

  return qualifyingRows.length > 0;
}

export function buildDuplicateCandidateHash(
  _filePath: string,
  _sheetName: string,
  row: ParsedHistoricalRow,
): string {
  const normalizedPayload = JSON.stringify({
    athleteName: row.athleteName?.trim().toLowerCase() ?? "",
    birthYear: row.birthYear ?? "",
    gender: row.gender?.trim().toLowerCase() ?? "male",
    height: row.height ?? "",
    weight: row.weight ?? "",
    flexibility: row.flexibility ?? "",
    sprint30: row.sprint30 ?? "",
    sprint30_2: row.sprint30_2 ?? "",
    agility: row.agility ?? "",
    verticalJump: row.verticalJump ?? "",
    passCount: row.passCount ?? "",
    ffmi: row.ffmi ?? "",
  });

  return createHash("sha256").update(normalizedPayload).digest("hex");
}
