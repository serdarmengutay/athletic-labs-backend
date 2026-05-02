import { Request, Response } from "express";
import sequelize from "../config/database";
import { QueryTypes } from "sequelize";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 75, 100] as const;
const CURRENT_YEAR = 2026;

type SortDirection = "asc" | "desc";

interface ScoutingQueryParams {
  page: number;
  pageSize: number;
  search?: string;
  birthYears?: number[];
  gender?: string;
  clubName?: string;
  minHeight?: number;
  maxHeight?: number;
  minWeight?: number;
  maxWeight?: number;
  minBmi?: number;
  maxBmi?: number;
  minSprint30m?: number;
  maxSprint30m?: number;
  minAgility?: number;
  maxAgility?: number;
  minFlexibility?: number;
  maxFlexibility?: number;
  minVerticalJump?: number;
  maxVerticalJump?: number;
  minPassCount?: number;
  maxPassCount?: number;
  minFatigueIndex?: number;
  maxFatigueIndex?: number;
  sortBy: string;
  sortDirection: SortDirection;
}

const SORT_COLUMN_MAP: Record<string, string> = {
  fullName: 'base.full_name',
  birthYear: 'base.birth_year',
  height: 'base.height',
  weight: 'base.weight',
  bmi: 'base.bmi',
  sprint30mSecond: 'base.sprint_30m_second',
  sprint30m: 'base.sprint_30m',
  agility: 'base.agility',
  flexibility: 'base.flexibility',
  verticalJump: 'base.vertical_jump',
  ffmi: 'base.ffmi',
  passCount: 'base.pass_count',
  fatigueIndex: 'base.fatigue_index',
  updatedAt: 'base.last_updated',
};

const DETAIL_METRICS = [
  { key: "height", label: "Boy", unit: "cm" },
  { key: "weight", label: "Kilo", unit: "kg" },
  { key: "bmi", label: "VKI", unit: "" },
  { key: "flexibility", label: "Esneklik", unit: "cm" },
  { key: "sprint_30m", label: "30m Koşu", unit: "sn" },
  { key: "sprint_30m_second", label: "İkinci 30 Metre", unit: "sn" },
  { key: "agility", label: "Çeviklik", unit: "sn" },
  { key: "vertical_jump", label: "Dikey Sıçrama", unit: "cm" },
  { key: "ffmi", label: "FFMI", unit: "" },
  { key: "pass_count", label: "Pas", unit: "" },
  { key: "fatigue_index", label: "Yorgunluk Endeksi", unit: "%" },
] as const;

function parseNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePageSize(value: unknown): number {
  const requestedSize = parseInteger(value, DEFAULT_PAGE_SIZE);
  return Math.min(Math.max(requestedSize, PAGE_SIZE_OPTIONS[0]), MAX_PAGE_SIZE);
}

function normalizeSortDirection(value: unknown): SortDirection {
  return String(value).toLowerCase() === "asc" ? "asc" : "desc";
}

function parseNumberArray(value: unknown): number[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  const rawValues = Array.isArray(value)
    ? value
    : String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const parsed = rawValues
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));

  return parsed.length > 0 ? parsed : undefined;
}

function parseQueryParams(req: Request): ScoutingQueryParams {
  return {
    page: Math.max(parseInteger(req.query.page, DEFAULT_PAGE), DEFAULT_PAGE),
    pageSize: normalizePageSize(req.query.pageSize),
    search: typeof req.query.search === "string" ? req.query.search.trim() : undefined,
    birthYears: parseNumberArray(req.query.birthYears),
    gender: typeof req.query.gender === "string" ? req.query.gender : undefined,
    clubName:
      typeof req.query.clubName === "string" ? req.query.clubName.trim() : undefined,
    minHeight: parseNumber(req.query.minHeight),
    maxHeight: parseNumber(req.query.maxHeight),
    minWeight: parseNumber(req.query.minWeight),
    maxWeight: parseNumber(req.query.maxWeight),
    minBmi: parseNumber(req.query.minBmi),
    maxBmi: parseNumber(req.query.maxBmi),
    minSprint30m: parseNumber(req.query.minSprint30m),
    maxSprint30m: parseNumber(req.query.maxSprint30m),
    minAgility: parseNumber(req.query.minAgility),
    maxAgility: parseNumber(req.query.maxAgility),
    minFlexibility: parseNumber(req.query.minFlexibility),
    maxFlexibility: parseNumber(req.query.maxFlexibility),
    minVerticalJump: parseNumber(req.query.minVerticalJump),
    maxVerticalJump: parseNumber(req.query.maxVerticalJump),
    minPassCount: parseNumber(req.query.minPassCount),
    maxPassCount: parseNumber(req.query.maxPassCount),
    minFatigueIndex: parseNumber(req.query.minFatigueIndex),
    maxFatigueIndex: parseNumber(req.query.maxFatigueIndex),
    sortBy:
      typeof req.query.sortBy === "string" && SORT_COLUMN_MAP[req.query.sortBy]
        ? req.query.sortBy
        : "updatedAt",
    sortDirection: normalizeSortDirection(req.query.sortDirection),
  };
}

function buildWhereClause(params: ScoutingQueryParams) {
  const clauses: string[] = [];
  const replacements: Record<string, unknown> = {};

  if (params.search) {
    clauses.push("base.full_name ILIKE :search");
    replacements.search = `%${params.search}%`;
  }

  if (params.birthYears && params.birthYears.length > 0) {
    clauses.push("base.birth_year IN (:birthYears)");
    replacements.birthYears = params.birthYears;
  }

  if (params.gender) {
    clauses.push("base.gender = :gender");
    replacements.gender = params.gender;
  }

  if (params.clubName) {
    clauses.push("base.club_name ILIKE :clubName");
    replacements.clubName = `%${params.clubName}%`;
  }

  const numericFilters: Array<[keyof ScoutingQueryParams, keyof ScoutingQueryParams, string]> = [
    ["minHeight", "maxHeight", "base.height"],
    ["minWeight", "maxWeight", "base.weight"],
    ["minBmi", "maxBmi", "base.bmi"],
    ["minSprint30m", "maxSprint30m", "base.sprint_30m"],
    ["minAgility", "maxAgility", "base.agility"],
    ["minFlexibility", "maxFlexibility", "base.flexibility"],
    ["minVerticalJump", "maxVerticalJump", "base.vertical_jump"],
    ["minPassCount", "maxPassCount", "base.pass_count"],
    ["minFatigueIndex", "maxFatigueIndex", "base.fatigue_index"],
  ];

  for (const [minKey, maxKey, column] of numericFilters) {
    if (params[minKey] !== undefined) {
      const replacementKey = String(minKey);
      clauses.push(`${column} >= :${replacementKey}`);
      replacements[replacementKey] = params[minKey];
    }

    if (params[maxKey] !== undefined) {
      const replacementKey = String(maxKey);
      clauses.push(`${column} <= :${replacementKey}`);
      replacements[replacementKey] = params[maxKey];
    }
  }

  return {
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    replacements,
  };
}

function getBaseDatasetSql() {
  return `
    SELECT
      at.id::text AS athlete_test_id,
      a.id AS athlete_id,
      a.full_name,
      a.birth_year,
      a.gender,
      ts.club_name,
      'TR'::text AS country_code,
      'Türkiye'::text AS country_name,
      CAST(m.height AS NUMERIC) AS height,
      CAST(m.weight AS NUMERIC) AS weight,
      CAST(COALESCE(m.bmi, (m.weight / NULLIF(POWER(m.height / 100.0, 2), 0))) AS NUMERIC) AS bmi,
      CAST(m.flexibility AS NUMERIC) AS flexibility,
      CAST(m.sprint_30m AS NUMERIC) AS sprint_30m,
      CAST(m.sprint_30m_second AS NUMERIC) AS sprint_30m_second,
      CAST(m.agility AS NUMERIC) AS agility,
      CAST(m.vertical_jump AS NUMERIC) AS vertical_jump,
      CAST(m.ffmi AS NUMERIC) AS ffmi,
      m.pass_count,
      CAST(
        COALESCE(
          m.fatigue_index,
          ((m.sprint_30m_second - m.sprint_30m) / NULLIF(m.sprint_30m, 0)) * 100
        ) AS NUMERIC
      ) AS fatigue_index,
      'live'::text AS source_type,
      COALESCE(ts.test_date, m.updated_at, at.updated_at) AS last_updated
    FROM athlete_tests at
    INNER JOIN athletes a ON a.id = at.athlete_id
    INNER JOIN measurements m ON m.athlete_test_id = at.id
    LEFT JOIN test_sessions ts ON ts.id = at.test_session_id

    UNION ALL

    SELECT
      CONCAT('historical:', h.id)::text AS athlete_test_id,
      h.id AS athlete_id,
      COALESCE(NULLIF(TRIM(h.full_name), ''), CONCAT('Historical Athlete ', h.birth_year)) AS full_name,
      h.birth_year,
      h.gender,
      h.club_name,
      COALESCE(NULLIF(TRIM(h.country_code), ''), 'TR') AS country_code,
      COALESCE(NULLIF(TRIM(h.country_name), ''), 'Türkiye') AS country_name,
      CAST(h.height AS NUMERIC) AS height,
      CAST(h.weight AS NUMERIC) AS weight,
      CAST(h.bmi AS NUMERIC) AS bmi,
      CAST(h.flexibility AS NUMERIC) AS flexibility,
      CAST(h.sprint_30m AS NUMERIC) AS sprint_30m,
      CAST(h.sprint_30m_second AS NUMERIC) AS sprint_30m_second,
      CAST(h.agility AS NUMERIC) AS agility,
      CAST(h.vertical_jump AS NUMERIC) AS vertical_jump,
      CAST(h.ffmi AS NUMERIC) AS ffmi,
      h.pass_count,
      CAST(h.fatigue_index AS NUMERIC) AS fatigue_index,
      'historical'::text AS source_type,
      h.updated_at AS last_updated
    FROM historical_athlete_data h
    WHERE h.full_name IS NOT NULL
      AND TRIM(h.full_name) <> ''
  `;
}

export const getScoutingPlayers = async (req: Request, res: Response) => {
  try {
    const params = parseQueryParams(req);
    const offset = (params.page - 1) * params.pageSize;
    const { whereClause, replacements } = buildWhereClause(params);
    const orderBy = SORT_COLUMN_MAP[params.sortBy] || SORT_COLUMN_MAP.updatedAt;

    const baseDatasetSql = getBaseDatasetSql();

    const [countRow] = await sequelize.query<{ total: string }>(
      `
        WITH base AS (
          ${baseDatasetSql}
        )
        SELECT COUNT(*)::int AS total
        FROM base
        ${whereClause}
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      },
    );

    const rows = await sequelize.query<
      {
        athlete_test_id: string;
        athlete_id: string;
        full_name: string;
        birth_year: number;
        gender: string;
        club_name: string | null;
        country_code: string;
        country_name: string;
        height: string | null;
        weight: string | null;
        bmi: string | null;
        flexibility: string | null;
        sprint_30m: string | null;
        sprint_30m_second: string | null;
        agility: string | null;
        vertical_jump: string | null;
        ffmi: string | null;
        pass_count: number | null;
        fatigue_index: string | null;
        source_type: string;
        last_updated: string | null;
      }
    >(
      `
        WITH base AS (
          ${baseDatasetSql}
        )
        SELECT *
        FROM base
        ${whereClause}
        ORDER BY ${orderBy} ${params.sortDirection.toUpperCase()}, base.athlete_test_id DESC
        LIMIT :limit OFFSET :offset
      `,
      {
        replacements: {
          ...replacements,
          limit: params.pageSize,
          offset,
        },
        type: QueryTypes.SELECT,
      },
    );

    return res.status(200).json({
      success: true,
      data: {
        items: rows.map((row) => ({
          athleteTestId: row.athlete_test_id,
          athleteId: row.athlete_id,
          fullName: row.full_name,
          birthYear: Number(row.birth_year),
          age: CURRENT_YEAR - Number(row.birth_year),
          gender: row.gender,
          clubName: row.club_name,
          countryCode: row.country_code,
          countryName: row.country_name,
          height: row.height === null ? null : Number(row.height),
          weight: row.weight === null ? null : Number(row.weight),
          bmi: row.bmi === null ? null : Number(row.bmi),
          flexibility: row.flexibility === null ? null : Number(row.flexibility),
          sprint30m: row.sprint_30m === null ? null : Number(row.sprint_30m),
          sprint30mSecond:
            row.sprint_30m_second === null ? null : Number(row.sprint_30m_second),
          agility: row.agility === null ? null : Number(row.agility),
          verticalJump:
            row.vertical_jump === null ? null : Number(row.vertical_jump),
          ffmi: row.ffmi === null ? null : Number(row.ffmi),
          passCount: row.pass_count,
          fatigueIndex:
            row.fatigue_index === null ? null : Number(row.fatigue_index),
          sourceType: row.source_type,
          updatedAt: row.last_updated,
        })),
        pagination: {
          page: params.page,
          pageSize: params.pageSize,
          total: Number(countRow?.total || 0),
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        },
        appliedFilters: params,
      },
    });
  } catch (error) {
    console.error("getScoutingPlayers error:", error);
    return res.status(500).json({
      success: false,
      message: "Scouting listesi getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const getScoutingFilterOptions = async (_req: Request, res: Response) => {
  try {
    const baseDatasetSql = getBaseDatasetSql();

    const [rangeRow] = await sequelize.query<Record<string, string | null>>(
      `
        WITH base AS (
          ${baseDatasetSql}
        )
        SELECT
          MIN(base.birth_year)::int AS min_birth_year,
          MAX(base.birth_year)::int AS max_birth_year,
          MIN(base.height)::numeric AS min_height,
          MAX(base.height)::numeric AS max_height,
          MIN(base.weight)::numeric AS min_weight,
          MAX(base.weight)::numeric AS max_weight,
          MIN(base.bmi)::numeric AS min_bmi,
          MAX(base.bmi)::numeric AS max_bmi,
          MIN(base.sprint_30m)::numeric AS min_sprint_30m,
          MAX(base.sprint_30m)::numeric AS max_sprint_30m,
          MIN(base.agility)::numeric AS min_agility,
          MAX(base.agility)::numeric AS max_agility,
          MIN(base.flexibility)::numeric AS min_flexibility,
          MAX(base.flexibility)::numeric AS max_flexibility,
          MIN(base.vertical_jump)::numeric AS min_vertical_jump,
          MAX(base.vertical_jump)::numeric AS max_vertical_jump,
          MIN(base.pass_count)::int AS min_pass_count,
          MAX(base.pass_count)::int AS max_pass_count
        FROM base
      `,
      { type: QueryTypes.SELECT },
    );

    const birthYearRows = await sequelize.query<{ birth_year: number }>(
      `
        WITH base AS (
          ${baseDatasetSql}
        )
        SELECT DISTINCT base.birth_year
        FROM base
        ORDER BY base.birth_year DESC
      `,
      { type: QueryTypes.SELECT },
    );

    const genderRows = await sequelize.query<{ gender: string }>(
      `
        WITH base AS (
          ${baseDatasetSql}
        )
        SELECT DISTINCT base.gender
        FROM base
        ORDER BY base.gender ASC
      `,
      { type: QueryTypes.SELECT },
    );

    return res.status(200).json({
      success: true,
      data: {
        birthYears: birthYearRows.map((row) => Number(row.birth_year)),
        genders: genderRows.map((row) => row.gender),
        clubs: (
          await sequelize.query<{ club_name: string }>(
            `
              WITH base AS (
                ${baseDatasetSql}
              )
              SELECT DISTINCT base.club_name
              FROM base
              WHERE base.club_name IS NOT NULL
                AND TRIM(base.club_name) <> ''
              ORDER BY base.club_name ASC
            `,
            { type: QueryTypes.SELECT },
          )
        ).map((row) => row.club_name),
        ranges: {
          height: {
            min: rangeRow.min_height === null ? null : Number(rangeRow.min_height),
            max: rangeRow.max_height === null ? null : Number(rangeRow.max_height),
          },
          weight: {
            min: rangeRow.min_weight === null ? null : Number(rangeRow.min_weight),
            max: rangeRow.max_weight === null ? null : Number(rangeRow.max_weight),
          },
          bmi: {
            min: rangeRow.min_bmi === null ? null : Number(rangeRow.min_bmi),
            max: rangeRow.max_bmi === null ? null : Number(rangeRow.max_bmi),
          },
          sprint30m: {
            min:
              rangeRow.min_sprint_30m === null ? null : Number(rangeRow.min_sprint_30m),
            max:
              rangeRow.max_sprint_30m === null ? null : Number(rangeRow.max_sprint_30m),
          },
          agility: {
            min: rangeRow.min_agility === null ? null : Number(rangeRow.min_agility),
            max: rangeRow.max_agility === null ? null : Number(rangeRow.max_agility),
          },
          flexibility: {
            min:
              rangeRow.min_flexibility === null
                ? null
                : Number(rangeRow.min_flexibility),
            max:
              rangeRow.max_flexibility === null
                ? null
                : Number(rangeRow.max_flexibility),
          },
          verticalJump: {
            min:
              rangeRow.min_vertical_jump === null
                ? null
                : Number(rangeRow.min_vertical_jump),
            max:
              rangeRow.max_vertical_jump === null
                ? null
                : Number(rangeRow.max_vertical_jump),
          },
          passCount: {
            min:
              rangeRow.min_pass_count === null ? null : Number(rangeRow.min_pass_count),
            max:
              rangeRow.max_pass_count === null ? null : Number(rangeRow.max_pass_count),
          },
        },
      },
    });
  } catch (error) {
    console.error("getScoutingFilterOptions error:", error);
    return res.status(500).json({
      success: false,
      message: "Scouting filtreleri getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const getScoutingPlayerDetail = async (req: Request, res: Response) => {
  try {
    const { athleteTestId } = req.params;
    const baseDatasetSql = getBaseDatasetSql();

    const [player] = await sequelize.query<
      {
        athlete_test_id: string;
        athlete_id: string;
        full_name: string;
        birth_year: number;
        gender: string;
        club_name: string | null;
        country_code: string;
        country_name: string;
        height: string | null;
        weight: string | null;
        bmi: string | null;
        flexibility: string | null;
        sprint_30m: string | null;
        sprint_30m_second: string | null;
        agility: string | null;
        vertical_jump: string | null;
        ffmi: string | null;
        pass_count: number | null;
        fatigue_index: string | null;
        source_type: string;
        last_updated: string | null;
      }
    >(
      `
        WITH base AS (
          ${baseDatasetSql}
        )
        SELECT *
        FROM base
        WHERE base.athlete_test_id = :athleteTestId
        LIMIT 1
      `,
      {
        replacements: { athleteTestId },
        type: QueryTypes.SELECT,
      },
    );

    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Sporcu detayı bulunamadı",
      });
    }

    const [comparisonRow] = await sequelize.query<Record<string, string | null>>(
      `
        WITH base AS (
          ${baseDatasetSql}
        )
        SELECT
          COUNT(*)::int AS group_size,
          AVG(base.height)::numeric AS avg_height,
          AVG(base.weight)::numeric AS avg_weight,
          AVG(base.bmi)::numeric AS avg_bmi,
          AVG(base.flexibility)::numeric AS avg_flexibility,
          AVG(base.sprint_30m)::numeric AS avg_sprint_30m,
          AVG(base.sprint_30m_second)::numeric AS avg_sprint_30m_second,
          AVG(base.agility)::numeric AS avg_agility,
          AVG(base.vertical_jump)::numeric AS avg_vertical_jump,
          AVG(base.ffmi)::numeric AS avg_ffmi,
          AVG(base.pass_count)::numeric AS avg_pass_count,
          AVG(base.fatigue_index)::numeric AS avg_fatigue_index
        FROM base
        WHERE base.birth_year = :birthYear
          AND base.gender = :gender
      `,
      {
        replacements: {
          birthYear: Number(player.birth_year),
          gender: player.gender,
        },
        type: QueryTypes.SELECT,
      },
    );

    const toNumber = (value: string | number | null | undefined) =>
      value === null || value === undefined ? null : Number(value);

    const metricCards = DETAIL_METRICS.map((metric) => ({
      key: metric.key,
      label: metric.label,
      unit: metric.unit,
      athleteValue: toNumber(player[metric.key as keyof typeof player] as string | number | null),
      ageGroupAverage: toNumber(
        comparisonRow[`avg_${metric.key}`] as string | number | null | undefined,
      ),
    }));

    return res.status(200).json({
      success: true,
      data: {
        athleteTestId: player.athlete_test_id,
        athleteId: player.athlete_id,
        fullName: player.full_name,
        birthYear: Number(player.birth_year),
        age: CURRENT_YEAR - Number(player.birth_year),
        gender: player.gender,
        clubName: player.club_name,
        countryCode: player.country_code,
        countryName: player.country_name,
        sourceType: player.source_type,
        updatedAt: player.last_updated,
        metrics: {
          height: toNumber(player.height),
          weight: toNumber(player.weight),
          bmi: toNumber(player.bmi),
          flexibility: toNumber(player.flexibility),
          sprint30m: toNumber(player.sprint_30m),
          sprint30mSecond: toNumber(player.sprint_30m_second),
          agility: toNumber(player.agility),
          verticalJump: toNumber(player.vertical_jump),
          ffmi: toNumber(player.ffmi),
          passCount: player.pass_count,
          fatigueIndex: toNumber(player.fatigue_index),
        },
        comparison: {
          groupSize: Number(comparisonRow.group_size || 0),
          label: `${Number(player.birth_year)} ${player.gender === "female" ? "Kadın" : "Erkek"} Grubu`,
          metrics: metricCards,
        },
      },
    });
  } catch (error) {
    console.error("getScoutingPlayerDetail error:", error);
    return res.status(500).json({
      success: false,
      message: "Sporcu detayı getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};
