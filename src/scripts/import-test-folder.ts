import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { QueryTypes, Transaction } from "sequelize";
import * as XLSX from "xlsx";
import sequelize from "../config/database";
import { normalizeGender } from "../config/gender";
import {
  isLikelyHistoricalTestSheet,
  mapExcelRow,
  ParsedHistoricalRow,
  shouldSkipImportFile,
} from "../utils/historicalImport";
import {
  athleteNameKey,
  computeMembershipEndDates,
  FolderMappingEntry,
  normalizeAthleteName,
  relativeToRoot,
  resolveFolderMapping,
  ResolvedFolderMapping,
  validateFolderMapping,
} from "../utils/testFolderImport";

// Usage:
//   npm run import-test-folder -- --folder "<TEST klasörü>" --mapping mapping.json          (dry run)
//   npm run import-test-folder -- --folder "<TEST klasörü>" --mapping mapping.json --apply  (writes)
//
// Schema is managed only by migrations; this script never alters or truncates tables.
// Clubs must already exist in `clubs`. Possible duplicate identities across clubs are
// written to identity_merge_candidates and never merged automatically.

const OUTPUT_DIR = path.resolve(__dirname, "../../outputs/test-folder-import");

// Compares names the way normalizeAthleteName does: NFC, collapsed whitespace, upper case.
const nameSql = (column: string) =>
  `upper(btrim(regexp_replace(normalize(${column}, NFC), '\\s+', ' ', 'g')))`;

interface CliOptions {
  folder: string;
  mappingPath: string;
  apply: boolean;
}

interface ImportReport {
  mode: "dry-run" | "apply";
  scannedFiles: number;
  importedFiles: number;
  unmappedFiles: string[];
  unknownClubs: string[];
  skippedFiles: string[];
  importedRows: number;
  alreadyImportedRows: number;
  linkedExistingAthletes: number;
  createdAthletes: number;
  createdTeams: string[];
  mergeCandidates: number;
  ambiguousRows: Array<{ filePath: string; rowNumber: number; reason: string }>;
  invalidRows: Array<{ filePath: string; sheetName: string; rowNumber: number; reason: string }>;
}

function parseArgs(argv: string[]): CliOptions {
  if (argv.includes("--truncate")) {
    throw new Error("--truncate kaldırıldı: bu script mevcut veriyi silmez.");
  }

  const valueOf = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const folder = valueOf("--folder");
  const mappingPath = valueOf("--mapping");

  if (!folder || !mappingPath) {
    throw new Error('Kullanım: --folder "<klasör>" --mapping <eşleme.json> [--apply]');
  }

  return { folder: path.resolve(folder), mappingPath: path.resolve(mappingPath), apply: argv.includes("--apply") };
}

async function walkExcelFiles(rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkExcelFiles(absolutePath)));
    } else if (entry.isFile() && /\.(xlsx|xls|csv)$/i.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

function metricCount(row: ParsedHistoricalRow): number {
  return [
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
}

async function findClubId(name: string): Promise<string | null> {
  const [club] = await sequelize.query<{ id: string }>(
    "SELECT id FROM clubs WHERE normalize(name, NFC) = normalize(:name, NFC)",
    { replacements: { name }, type: QueryTypes.SELECT },
  );
  return club?.id ?? null;
}

async function findOrCreateTeam(
  clubId: string,
  teamName: string,
  report: ImportReport,
  transaction: Transaction,
): Promise<string> {
  const [team] = await sequelize.query<{ id: string }>(
    "SELECT id FROM teams WHERE club_id = :clubId AND normalize(name, NFC) = normalize(:teamName, NFC)",
    { replacements: { clubId, teamName }, type: QueryTypes.SELECT, transaction },
  );
  if (team) return team.id;

  const id = randomUUID();
  await sequelize.query(
    "INSERT INTO teams (id, club_id, name, created_at, updated_at) VALUES (:id, :clubId, :teamName, now(), now())",
    { replacements: { id, clubId, teamName }, transaction },
  );
  report.createdTeams.push(teamName);
  return id;
}

interface AthleteCandidate {
  id: string;
  in_club: boolean;
}

// Same name + birth year inside the same club is treated as the same athlete.
async function findAthleteCandidates(
  name: string,
  birthYear: number,
  clubId: string,
  transaction: Transaction,
): Promise<AthleteCandidate[]> {
  return sequelize.query<AthleteCandidate>(
    `
      SELECT a.id,
        EXISTS (
          SELECT 1 FROM athlete_team_memberships m
          JOIN teams t ON t.id = m.team_id
          WHERE m.athlete_id = a.id AND t.club_id = :clubId
        ) OR EXISTS (
          SELECT 1 FROM athlete_tests at
          JOIN test_sessions s ON s.id = at.test_session_id
          WHERE at.athlete_id = a.id AND s.club_id = :clubId
        ) AS in_club
      FROM athletes a
      WHERE ${nameSql("a.full_name")} = ${nameSql(":name")}
        AND a.birth_year = :birthYear
    `,
    { replacements: { name, birthYear, clubId }, type: QueryTypes.SELECT, transaction },
  );
}

async function ensureMembership(
  athleteId: string,
  teamId: string,
  startDate: string,
  transaction: Transaction,
) {
  const memberships = await sequelize.query<{ id: string; team_id: string; start_date: string; end_date: string | null }>(
    "SELECT id, team_id, start_date::text, end_date::text FROM athlete_team_memberships WHERE athlete_id = :athleteId",
    { replacements: { athleteId }, type: QueryTypes.SELECT, transaction },
  );

  if (!memberships.some((m) => m.team_id === teamId && m.start_date === startDate)) {
    const id = randomUUID();
    await sequelize.query(
      `INSERT INTO athlete_team_memberships (id, athlete_id, team_id, start_date, end_date, source, created_at, updated_at)
       VALUES (:id, :athleteId, :teamId, :startDate, NULL, 'historical_import', now(), now())`,
      { replacements: { id, athleteId, teamId, startDate }, transaction },
    );
    memberships.push({ id, team_id: teamId, start_date: startDate, end_date: null });
  }

  const changes = computeMembershipEndDates(
    memberships.map((m) => ({ id: m.id, startDate: m.start_date, endDate: m.end_date })),
  );
  for (const change of changes) {
    await sequelize.query(
      "UPDATE athlete_team_memberships SET end_date = :endDate, updated_at = now() WHERE id = :id",
      { replacements: change, transaction },
    );
  }
}

async function importRow(
  row: ParsedHistoricalRow,
  mapping: ResolvedFolderMapping,
  clubId: string,
  filePath: string,
  rowNumber: number,
  report: ImportReport,
  transaction: Transaction,
) {
  const fullName = normalizeAthleteName(row.athleteName!);
  const birthYear = row.birthYear!;

  // A row counts as already imported when the name matches, or, for names corrected after
  // import, when at least three measured values are identical for the same club, date and year.
  const hasFingerprint = metricCount(row) >= 3;
  const [existingRow] = await sequelize.query<{ id: string }>(
    `SELECT id FROM historical_athlete_data
     WHERE club_id = :clubId AND test_date = :testDate AND birth_year = :birthYear
       AND (
         ${nameSql("full_name")} = ${nameSql(":fullName")}
         OR (:hasFingerprint
           AND height IS NOT DISTINCT FROM :height
           AND weight IS NOT DISTINCT FROM :weight
           AND flexibility IS NOT DISTINCT FROM :flexibility
           AND sprint_30m IS NOT DISTINCT FROM :sprint30
           AND agility IS NOT DISTINCT FROM :agility
           AND vertical_jump IS NOT DISTINCT FROM :verticalJump)
       )
     LIMIT 1`,
    {
      replacements: {
        clubId,
        testDate: mapping.testDate,
        birthYear,
        fullName,
        hasFingerprint,
        height: row.height ?? null,
        weight: row.weight ?? null,
        flexibility: row.flexibility ?? null,
        sprint30: row.sprint30 ?? null,
        agility: row.agility ?? null,
        verticalJump: row.verticalJump ?? null,
      },
      type: QueryTypes.SELECT,
      transaction,
    },
  );
  if (existingRow) {
    report.alreadyImportedRows += 1;
    return;
  }

  const candidates = await findAthleteCandidates(fullName, birthYear, clubId, transaction);
  const sameClub = candidates.filter((candidate) => candidate.in_club);

  if (sameClub.length > 1) {
    report.ambiguousRows.push({
      filePath,
      rowNumber,
      reason: `${athleteNameKey(fullName)} (${birthYear}) bu kulüpte birden fazla sporcuyla eşleşiyor`,
    });
    return;
  }

  let athleteId: string;
  if (sameClub.length === 1) {
    athleteId = sameClub[0].id;
    report.linkedExistingAthletes += 1;
  } else {
    athleteId = randomUUID();
    await sequelize.query(
      `INSERT INTO athletes (id, full_name, birth_year, gender, created_at, updated_at)
       VALUES (:athleteId, :fullName, :birthYear, :gender, now(), now())`,
      {
        replacements: {
          athleteId,
          fullName,
          birthYear,
          gender: row.gender ? normalizeGender(row.gender) : mapping.defaultGender,
        },
        transaction,
      },
    );
    report.createdAthletes += 1;

    for (const other of candidates) {
      await sequelize.query(
        `INSERT INTO identity_merge_candidates (id, athlete_id_a, athlete_id_b, reason, match_score, status, created_at, updated_at)
         VALUES (:id, :a, :b, :reason, 100, 'pending', now(), now())
         ON CONFLICT (athlete_id_a, athlete_id_b) DO NOTHING`,
        {
          replacements: {
            id: randomUUID(),
            a: other.id,
            b: athleteId,
            reason: `Aynı ad-soyad ve doğum yılı başka kulüpte mevcut; ${mapping.club} importu (${path.basename(filePath)})`,
          },
          transaction,
        },
      );
      report.mergeCandidates += 1;
    }
  }

  const teamId = await findOrCreateTeam(clubId, mapping.team, report, transaction);
  await ensureMembership(athleteId, teamId, mapping.testDate, transaction);

  await sequelize.query(
    `INSERT INTO historical_athlete_data (
       id, full_name, club_name, club_id, team_id, athlete_id, test_date, test_date_estimated,
       country_code, country_name, birth_year, gender, height, weight, bmi, flexibility,
       sprint_30m, sprint_30m_second, agility, vertical_jump, pass_count, ffmi, fatigue_index,
       created_at, updated_at
     ) VALUES (
       :id, :fullName, :clubName, :clubId, :teamId, :athleteId, :testDate, :testDateEstimated,
       'TR', 'Türkiye', :birthYear, :gender, :height, :weight, :bmi, :flexibility,
       :sprint30, :sprint30Second, :agility, :verticalJump, :passCount, :ffmi, :fatigueIndex,
       now(), now()
     )`,
    {
      replacements: {
        id: randomUUID(),
        fullName,
        clubName: mapping.club,
        clubId,
        teamId,
        athleteId,
        testDate: mapping.testDate,
        testDateEstimated: mapping.testDateEstimated,
        birthYear,
        gender: row.gender ? normalizeGender(row.gender) : mapping.defaultGender,
        height: row.height ?? null,
        weight: row.weight ?? null,
        bmi: row.bmi ?? null,
        flexibility: row.flexibility ?? null,
        sprint30: row.sprint30 ?? null,
        sprint30Second: row.sprint30_2 ?? null,
        agility: row.agility ?? null,
        verticalJump: row.verticalJump ?? null,
        passCount: row.passCount ?? null,
        ffmi: row.ffmi ?? null,
        fatigueIndex: row.fatigueIndex ?? null,
      },
      transaction,
    },
  );
  report.importedRows += 1;
}

async function importWorkbookFile(
  filePath: string,
  options: CliOptions,
  entries: FolderMappingEntry[],
  report: ImportReport,
) {
  const relativePath = relativeToRoot(options.folder, filePath);
  const mapping = resolveFolderMapping(relativePath, entries);

  if (!mapping) {
    report.unmappedFiles.push(relativePath);
    return;
  }

  const clubId = await findClubId(mapping.club);
  if (!clubId) {
    if (!report.unknownClubs.includes(mapping.club)) report.unknownClubs.push(mapping.club);
    report.skippedFiles.push(relativePath);
    return;
  }

  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const transaction = await sequelize.transaction();
  let importedAnySheet = false;

  try {
    for (const sheetName of workbook.SheetNames) {
      const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      const parsedRows = rawRows.map(mapExcelRow);
      if (!isLikelyHistoricalTestSheet(parsedRows)) continue;
      importedAnySheet = true;

      for (let index = 0; index < parsedRows.length; index++) {
        const row = parsedRows[index];
        const rowNumber = index + 2;

        if (!row.athleteName || !row.birthYear || metricCount(row) < 1) {
          report.invalidRows.push({
            filePath: relativePath,
            sheetName,
            rowNumber,
            reason: "Eksik sporcu adı, doğum yılı veya metrik verisi",
          });
          continue;
        }

        await importRow(row, mapping, clubId, relativePath, rowNumber, report, transaction);
      }
    }

    if (options.apply) {
      await transaction.commit();
    } else {
      await transaction.rollback();
    }
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  if (importedAnySheet) {
    report.importedFiles += 1;
  } else {
    report.skippedFiles.push(relativePath);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const entries = validateFolderMapping(JSON.parse(await fs.readFile(options.mappingPath, "utf8")));
  const report: ImportReport = {
    mode: options.apply ? "apply" : "dry-run",
    scannedFiles: 0,
    importedFiles: 0,
    unmappedFiles: [],
    unknownClubs: [],
    skippedFiles: [],
    importedRows: 0,
    alreadyImportedRows: 0,
    linkedExistingAthletes: 0,
    createdAthletes: 0,
    createdTeams: [],
    mergeCandidates: 0,
    ambiguousRows: [],
    invalidRows: [],
  };

  try {
    await sequelize.authenticate();

    const files = (await walkExcelFiles(options.folder)).filter((filePath) => !shouldSkipImportFile(filePath));
    report.scannedFiles = files.length;

    for (const filePath of files) {
      await importWorkbookFile(filePath, options, entries, report);
    }

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const reportPath = path.join(OUTPUT_DIR, `import-report-${report.mode}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

    console.log(`${options.apply ? "Yazıldı" : "Deneme (hiçbir şey yazılmadı)"}: ${report.importedRows} satır, ${report.createdAthletes} yeni sporcu, ${report.linkedExistingAthletes} mevcut sporcuya bağlandı, ${report.alreadyImportedRows} zaten vardı.`);
    console.log(`Eşlemesiz dosya: ${report.unmappedFiles.length}, bilinmeyen kulüp: ${report.unknownClubs.length}, belirsiz satır: ${report.ambiguousRows.length}, birleştirme adayı: ${report.mergeCandidates}.`);
    console.log(`Rapor: ${reportPath}`);
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("TEST folder import failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
