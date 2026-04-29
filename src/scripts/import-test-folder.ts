import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import sequelize from "../config/database";
import { ATHLETE_GENDERS, normalizeGender } from "../config/gender";
import { HistoricalAthleteData } from "../models";
import {
  buildDuplicateCandidateHash,
  isLikelyHistoricalTestSheet,
  mapExcelRow,
  ParsedHistoricalRow,
  shouldSkipImportFile,
} from "../utils/historicalImport";

const TEST_FOLDER = "/Users/setfree/Documents/TEST";
const OUTPUT_DIR = path.resolve(
  "/Users/setfree/Documents/projects/athletic-labs-backend/outputs/test-folder-import",
);
const DRY_RUN = process.argv.includes("--dry-run");

interface DuplicateCandidateEntry {
  filePath: string;
  sheetName: string;
  rowNumber: number;
  athleteName?: string;
  birthYear?: number;
  hash: string;
}

interface ImportReport {
  scannedFiles: number;
  importedFiles: number;
  skippedFiles: string[];
  importedRows: number;
  duplicateCandidateRows: number;
  invalidRows: Array<{
    filePath: string;
    sheetName: string;
    rowNumber: number;
    reason: string;
  }>;
  duplicateCandidates: DuplicateCandidateEntry[];
}

async function ensureHistoricalTableColumns() {
  await sequelize.query(`
    ALTER TABLE historical_athlete_data
    ADD COLUMN IF NOT EXISTS gender VARCHAR(10)
  `);
  await sequelize.query(`
    ALTER TABLE historical_athlete_data
    ADD COLUMN IF NOT EXISTS pass_count INTEGER
  `);
  await sequelize.query(`
    ALTER TABLE historical_athlete_data
    ADD COLUMN IF NOT EXISTS fatigue_index NUMERIC(5, 2)
  `);
  await sequelize.query(`
    UPDATE historical_athlete_data
    SET gender = '${ATHLETE_GENDERS.MALE}'
    WHERE gender IS NULL OR TRIM(gender) = ''
  `);
  await sequelize.query(`
    ALTER TABLE historical_athlete_data
    ALTER COLUMN gender SET DEFAULT '${ATHLETE_GENDERS.MALE}'
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS historical_athlete_data_birth_year_gender_idx
    ON historical_athlete_data (birth_year, gender)
  `);
}

async function walkFiles(rootDir: string): Promise<string[]> {
  const discovered: string[] = [];
  const entries = await fs.readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      discovered.push(...(await walkFiles(absolutePath)));
      continue;
    }

    if (!entry.isFile()) continue;
    if (!/\.(xlsx|xls|csv)$/i.test(entry.name)) continue;

    discovered.push(absolutePath);
  }

  return discovered;
}

function isImportableRow(row: ParsedHistoricalRow): boolean {
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

  return Boolean(row.athleteName && row.birthYear && metricCount >= 1);
}

async function importWorkbookFile(
  filePath: string,
  report: ImportReport,
  duplicateHashes: Map<string, DuplicateCandidateEntry>,
) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  let importedAnySheet = false;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet);
    const parsedRows = rawRows.map(mapExcelRow);

    if (!isLikelyHistoricalTestSheet(parsedRows)) {
      continue;
    }

    importedAnySheet = true;

    for (let index = 0; index < parsedRows.length; index++) {
      const row = parsedRows[index];
      const rowNumber = index + 2;

      if (!isImportableRow(row)) {
        report.invalidRows.push({
          filePath,
          sheetName,
          rowNumber,
          reason: "Eksik sporcu adı, doğum yılı veya metrik verisi",
        });
        continue;
      }

      const duplicateHash = buildDuplicateCandidateHash(filePath, sheetName, row);
      const existingDuplicate = duplicateHashes.get(duplicateHash);

      if (existingDuplicate) {
        report.duplicateCandidates.push({
          filePath,
          sheetName,
          rowNumber,
          athleteName: row.athleteName,
          birthYear: row.birthYear,
          hash: duplicateHash,
        });
      } else {
        duplicateHashes.set(duplicateHash, {
          filePath,
          sheetName,
          rowNumber,
          athleteName: row.athleteName,
          birthYear: row.birthYear,
          hash: duplicateHash,
        });
      }

      if (!DRY_RUN) {
        await HistoricalAthleteData.create({
          birth_year: row.birthYear!,
          gender: normalizeGender(row.gender),
          height: row.height ?? null,
          weight: row.weight ?? null,
          bmi: row.bmi ?? null,
          flexibility: row.flexibility ?? null,
          sprint_30m: row.sprint30 ?? null,
          sprint_30m_second: row.sprint30_2 ?? null,
          agility: row.agility ?? null,
          vertical_jump: row.verticalJump ?? null,
          pass_count: row.passCount ?? null,
          ffmi: row.ffmi ?? null,
          fatigue_index: row.fatigueIndex ?? null,
        });
      }

      report.importedRows += 1;
    }
  }

  if (importedAnySheet) {
    report.importedFiles += 1;
  } else {
    report.skippedFiles.push(filePath);
  }
}

async function writeReport(report: ImportReport) {
  report.duplicateCandidateRows = report.duplicateCandidates.length;
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const reportPath = path.join(OUTPUT_DIR, "historical-import-report.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  return reportPath;
}

async function main() {
  const report: ImportReport = {
    scannedFiles: 0,
    importedFiles: 0,
    skippedFiles: [],
    importedRows: 0,
    duplicateCandidateRows: 0,
    invalidRows: [],
    duplicateCandidates: [],
  };
  const duplicateHashes = new Map<string, DuplicateCandidateEntry>();

  try {
    if (!DRY_RUN) {
      await sequelize.authenticate();
      await ensureHistoricalTableColumns();
    }

    const allFiles = await walkFiles(TEST_FOLDER);
    const importableFiles = allFiles.filter((filePath) => !shouldSkipImportFile(filePath));
    report.scannedFiles = importableFiles.length;

    for (const filePath of importableFiles) {
      await importWorkbookFile(filePath, report, duplicateHashes);
    }

    const reportPath = await writeReport(report);
    console.log(`Import completed. Report saved to ${reportPath}`);
    console.log(
      `${DRY_RUN ? "Scanned" : "Imported"} ${report.importedRows} rows from ${report.importedFiles} files. Duplicate candidates: ${report.duplicateCandidates.length}.`,
    );
  } catch (error) {
    console.error("TEST folder import failed:", error);
    process.exitCode = 1;
  } finally {
    if (!DRY_RUN) {
      await sequelize.close();
    }
  }
}

main();
