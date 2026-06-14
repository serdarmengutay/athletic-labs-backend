/**
 * Performance Calculation Service
 * MVP implementation for athlete performance report generation
 */

import { HistoricalAthleteData, Measurement } from "../models";
import { classifyHandgrip } from "../config/handgripBenchmarks";
import sequelize from "../config/database";
import { Op, QueryTypes } from "sequelize";
import {
  AgeGroupMetricRepository,
  COMPARISON_RESULT_STATUS,
  calculateAgeGroupMetricComparisons,
  calculateMetricComparisonFromStats,
} from "./ageGroupMetricRankingService";
import { AthleteGender } from "../config/gender";
import {
  METRIC_CONFIG as BASE_METRIC_CONFIG,
  MetricConfigMap,
} from "../config/metricConfig";
import {
  calculateFallbackScore,
  getFallbackAverage,
} from "../config/fallbackBenchmarks";
import { normalizeSprintMeasurements } from "../utils/sprintMeasurements";

// Metric configuration: which direction is "better"
const METRIC_CONFIG: Record<string, { lowerIsBetter: boolean; label: string }> =
  {
    height: { lowerIsBetter: false, label: "Boy" },
    weight: { lowerIsBetter: false, label: "Kilo" },
    bmi: { lowerIsBetter: false, label: "BMI" },
    flexibility: { lowerIsBetter: false, label: "Esneklik" },
    sprint_30m: { lowerIsBetter: true, label: "30m Sprint (1)" },
    sprint_30m_second: { lowerIsBetter: true, label: "30m Sprint (2)" },
    agility: { lowerIsBetter: true, label: "Çeviklik" },
    vertical_jump: { lowerIsBetter: false, label: "Dikey Sıçrama" },
    pass_count: { lowerIsBetter: false, label: "Pas" },
    ffmi: { lowerIsBetter: false, label: "FFMI" },
    fatigue_index: { lowerIsBetter: true, label: "Yorgunluk İndeksi" },
  };

export function calculateBMI(heightCm: number, weightKg: number): number {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return 0;
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(2));
}

export function calculateFFMI(
  heightCm: number,
  weightKg: number,
  bodyFatPercent = 15,
): number {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return 0;
  const heightM = heightCm / 100;
  const leanMass = weightKg * (1 - bodyFatPercent / 100);
  return Number((leanMass / (heightM * heightM)).toFixed(2));
}

export function calculateFatigueIndex(
  sprint1: number,
  sprint2: number,
): number {
  const normalized = normalizeSprintMeasurements(sprint1, sprint2);
  if (
    normalized.sprint30m === null ||
    normalized.sprint30mSecond === null
  ) {
    return 0;
  }
  return Number(
    (
      ((normalized.sprint30mSecond - normalized.sprint30m) /
        normalized.sprint30m) *
      100
    ).toFixed(2),
  );
}

function calculatePassScore(passCount: number | null, birthYear: number): number | null {
  if (passCount === null || passCount === undefined || isNaN(passCount)) return null;

  const age = new Date().getFullYear() - birthYear;
  const target = Math.max(12, Math.min(32, 10 + age * 1.15));
  return Math.max(1, Math.min(100, Math.round((passCount / target) * 70)));
}

function getValidReferenceValues(referenceValues: (number | null)[]): number[] {
  return referenceValues.filter(
    (v): v is number => v !== null && v !== undefined && !isNaN(v),
  );
}

export function calculatePercentile(
  value: number | null,
  referenceValues: (number | null)[],
  lowerIsBetter = false,
): number | null {
  // Guard: null/undefined/NaN value
  if (value === null || value === undefined || isNaN(value)) return null;

  const validValues = getValidReferenceValues(referenceValues);

  // Guard: no valid reference values
  if (validValues.length === 0) return null;

  const betterCount = lowerIsBetter
    ? validValues.filter((v) => v > value).length
    : validValues.filter((v) => v < value).length;
  const equalCount = validValues.filter((v) => v === value).length;

  // Mid-rank percentile:
  // below + half of ties, so identical values do not collapse to 0/100 unfairly.
  const percentile =
    ((betterCount + equalCount * 0.5) / validValues.length) * 100;

  if (isNaN(percentile)) return null;
  return Number(Math.max(0, Math.min(100, percentile)).toFixed(1));
}

interface ReferenceAthleteData {
  gender: string;
  height: number | null;
  weight: number | null;
  bmi: number | null;
  flexibility: number | null;
  sprint_30m: number | null;
  sprint_30m_second: number | null;
  agility: number | null;
  vertical_jump: number | null;
  pass_count: number | null;
  ffmi: number | null;
  fatigue_index: number | null;
}

const REPORT_METRIC_CONFIG: MetricConfigMap = {
  sprint_30m: BASE_METRIC_CONFIG.sprint_30m,
  sprint_30m_second: BASE_METRIC_CONFIG.sprint_30m_second,
  agility: BASE_METRIC_CONFIG.agility,
  flexibility: BASE_METRIC_CONFIG.flexibility,
  vertical_jump: BASE_METRIC_CONFIG.vertical_jump,
  pass_count: BASE_METRIC_CONFIG.pass_count,
  bmi: BASE_METRIC_CONFIG.bmi,
  fatigue_index: BASE_METRIC_CONFIG.fatigue_index,
};

type ReportMetricKey = keyof typeof REPORT_METRIC_CONFIG;

const REPORT_METRIC_KEYS = Object.keys(
  REPORT_METRIC_CONFIG,
) as ReportMetricKey[];

function buildMetricRangeWhere(metricKey: ReportMetricKey, tableAlias: string): string {
  const metricConfig = REPORT_METRIC_CONFIG[metricKey];
  if (!metricConfig.validRange) return "";

  const clauses: string[] = [];
  if (metricConfig.validRange.min !== undefined) {
    clauses.push(`${tableAlias}.${metricKey} >= ${metricConfig.validRange.min}`);
  }
  if (metricConfig.validRange.max !== undefined) {
    clauses.push(`${tableAlias}.${metricKey} <= ${metricConfig.validRange.max}`);
  }

  return clauses.length > 0 ? ` AND ${clauses.join(" AND ")}` : "";
}

function buildMetricPoolSql(
  metricKey: ReportMetricKey,
  excludeAthleteTestId?: string,
): string {
  const measurementExclusion = excludeAthleteTestId
    ? `AND at.id <> :excludeAthleteTestId`
    : "";
  const measurementRangeWhere = buildMetricRangeWhere(metricKey, "m");
  const historicalRangeWhere = buildMetricRangeWhere(metricKey, "h");

  return `
    SELECT CAST(m.${metricKey} AS NUMERIC) AS value
    FROM measurements m
    INNER JOIN athlete_tests at ON at.id = m.athlete_test_id
    INNER JOIN athletes a ON a.id = at.athlete_id
    WHERE a.birth_year = :birthYear
      AND a.gender = :gender
      AND m.${metricKey} IS NOT NULL
      ${measurementExclusion}
      ${measurementRangeWhere}

    UNION ALL

    SELECT CAST(h.${metricKey} AS NUMERIC) AS value
    FROM historical_athlete_data h
    WHERE h.birth_year = :birthYear
      AND h.gender = :gender
      AND h.${metricKey} IS NOT NULL
      ${historicalRangeWhere}
  `;
}

function toInteger(value: unknown): number {
  return Number.parseInt(String(value ?? 0), 10) || 0;
}

function toNullableNumeric(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function createAgeGroupMetricRepository(
  excludeAthleteTestId?: string,
): AgeGroupMetricRepository {
  return {
    async getMetricDistributionStats({
      birthYear,
      gender,
      metricKey,
      metricValue,
    }) {
      const typedMetricKey = metricKey as ReportMetricKey;
      const metricConfig = REPORT_METRIC_CONFIG[typedMetricKey];
      const comparisonOperator =
        metricConfig.direction === "lower_is_better" ? "<" : ">";
      const reverseComparisonOperator =
        metricConfig.direction === "lower_is_better" ? ">" : "<";

      const metricPoolSql = buildMetricPoolSql(
        typedMetricKey,
        excludeAthleteTestId,
      );

      const [row] = await sequelize.query<{
        groupSize: string;
        betterPerformerCount: string;
        worsePerformerCount: string;
        equalValueCount: string;
      }>(
        `
          SELECT
            COUNT(*)::int AS "groupSize",
            COUNT(*) FILTER (WHERE value ${comparisonOperator} :metricValue)::int AS "betterPerformerCount",
            COUNT(*) FILTER (WHERE value ${reverseComparisonOperator} :metricValue)::int AS "worsePerformerCount",
            COUNT(*) FILTER (WHERE value = :metricValue)::int AS "equalValueCount"
          FROM (
            ${metricPoolSql}
          ) AS metric_pool
        `,
        {
          type: QueryTypes.SELECT,
          replacements: {
            birthYear,
            gender,
            metricValue,
            excludeAthleteTestId,
          },
        },
      );

      return {
        groupSize: toInteger(row?.groupSize),
        betterPerformerCount: toInteger(row?.betterPerformerCount),
        worsePerformerCount: toInteger(row?.worsePerformerCount),
        equalValueCount: toInteger(row?.equalValueCount),
      };
    },
  };
}

async function getAgeGroupMetricAverage(
  birthYear: number,
  gender: AthleteGender,
  metricKey: ReportMetricKey,
  excludeAthleteTestId?: string,
): Promise<number | null> {
  const metricPoolSql = buildMetricPoolSql(metricKey, excludeAthleteTestId);

  const [row] = await sequelize.query<{ averageValue: string | null }>(
    `
      SELECT AVG(value)::numeric AS "averageValue"
      FROM (
        ${metricPoolSql}
      ) AS metric_pool
    `,
    {
      type: QueryTypes.SELECT,
      replacements: {
        birthYear,
        gender,
        excludeAthleteTestId,
      },
    },
  );

  return toNullableNumeric(row?.averageValue);
}

async function buildAgeGroupAveragesFromDatabase(
  birthYear: number,
  gender: AthleteGender,
  excludeAthleteTestId?: string,
): Promise<FrontendAthleteReport["ageGroupAverages"]> {
  const [
    sprint1,
    sprint2,
    agility,
    flexibility,
    verticalJump,
    passCount,
    bmi,
  ] = await Promise.all([
    getAgeGroupMetricAverage(birthYear, gender, "sprint_30m", excludeAthleteTestId),
    getAgeGroupMetricAverage(
      birthYear,
      gender,
      "sprint_30m_second",
      excludeAthleteTestId,
    ),
    getAgeGroupMetricAverage(birthYear, gender, "agility", excludeAthleteTestId),
    getAgeGroupMetricAverage(
      birthYear,
      gender,
      "flexibility",
      excludeAthleteTestId,
    ),
    getAgeGroupMetricAverage(
      birthYear,
      gender,
      "vertical_jump",
      excludeAthleteTestId,
    ),
    getAgeGroupMetricAverage(birthYear, gender, "pass_count", excludeAthleteTestId),
    getAgeGroupMetricAverage(birthYear, gender, "bmi", excludeAthleteTestId),
  ]);

  return {
    sprint1,
    sprint2,
    agility,
    flexibility,
    verticalJump,
    passCount,
    bmi,
  };
}

async function buildAgeGroupAverageScores(
  birthYear: number,
  gender: AthleteGender,
  excludeAthleteTestId: string | undefined,
  ageGroupAverages: FrontendAthleteReport["ageGroupAverages"],
): Promise<FrontendAthleteReport["ageGroupPercentiles"]> {
  const repository = createAgeGroupMetricRepository(excludeAthleteTestId);

  const entries = await Promise.all(
    REPORT_METRIC_KEYS.filter((metricKey) =>
      ["sprint_30m", "sprint_30m_second", "agility", "flexibility", "vertical_jump", "pass_count", "bmi"].includes(metricKey),
    ).map(async (metricKey) => {
      const averageValueMap: Record<
        string,
        FrontendAthleteReport["ageGroupAverages"][keyof FrontendAthleteReport["ageGroupAverages"]]
      > = {
        sprint_30m: ageGroupAverages.sprint1,
        sprint_30m_second: ageGroupAverages.sprint2,
        agility: ageGroupAverages.agility,
        flexibility: ageGroupAverages.flexibility,
        vertical_jump: ageGroupAverages.verticalJump,
        pass_count: ageGroupAverages.passCount,
        bmi: ageGroupAverages.bmi,
      };

      const averageValue = averageValueMap[metricKey];
      if (averageValue === null || averageValue === undefined) {
        return [metricKey, null] as const;
      }

      const stats = await repository.getMetricDistributionStats({
        birthYear,
        gender,
        metricKey,
        metricValue: averageValue,
      });

      const comparison = calculateMetricComparisonFromStats(
        metricKey,
        averageValue,
        stats,
        REPORT_METRIC_CONFIG[metricKey],
      );

      return [
        metricKey,
        comparison.status === COMPARISON_RESULT_STATUS.SCORED
          ? comparison.score
          : null,
      ] as const;
    }),
  );

  const entryMap = Object.fromEntries(entries);

  return {
    sprint1: toNullableNumeric(entryMap.sprint_30m),
    sprint2: toNullableNumeric(entryMap.sprint_30m_second),
    agility: toNullableNumeric(entryMap.agility),
    flexibility: toNullableNumeric(entryMap.flexibility),
    verticalJump: toNullableNumeric(entryMap.vertical_jump),
    passCount: toNullableNumeric(entryMap.pass_count),
    bmi: toNullableNumeric(entryMap.bmi),
  };
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return isNaN(parsed) ? null : parsed;
}

function mapMeasurementToReferenceData(
  measurement: Measurement,
): ReferenceAthleteData {
  const derived = calculateDerivedMetrics(measurement);

  return {
    gender: (measurement as any).athleteTest?.athlete?.gender ?? "male",
    height: toNullableNumber(measurement.height),
    weight: toNullableNumber(measurement.weight),
    bmi: toNullableNumber(measurement.bmi) ?? derived.bmi,
    flexibility: toNullableNumber(measurement.flexibility),
    sprint_30m: toNullableNumber(measurement.sprint_30m),
    sprint_30m_second: toNullableNumber(measurement.sprint_30m_second),
    agility: toNullableNumber(measurement.agility),
    vertical_jump: toNullableNumber(measurement.vertical_jump),
    pass_count: toNullableNumber(measurement.pass_count),
    ffmi: toNullableNumber(measurement.ffmi) ?? derived.ffmi,
    fatigue_index:
      toNullableNumber(measurement.fatigue_index) ?? derived.fatigueIndex,
  };
}

function mapHistoricalToReferenceData(
  historical: HistoricalAthleteData,
): ReferenceAthleteData {
  const height = toNullableNumber(historical.height);
  const weight = toNullableNumber(historical.weight);

  return {
    gender: historical.gender,
    height,
    weight,
    bmi:
      toNullableNumber(historical.bmi) ??
      (height && weight ? calculateBMI(height, weight) : null),
    flexibility: toNullableNumber(historical.flexibility),
    sprint_30m: toNullableNumber(historical.sprint_30m),
    sprint_30m_second: toNullableNumber(historical.sprint_30m_second),
    agility: toNullableNumber(historical.agility),
    vertical_jump: toNullableNumber(historical.vertical_jump),
    pass_count: null,
    ffmi: toNullableNumber(historical.ffmi),
    fatigue_index: null,
  };
}

export async function getReferenceDataByBirthYear(
  birthYear: number,
  gender: string,
  excludeAthleteTestId?: string,
): Promise<ReferenceAthleteData[]> {
  const measurementReferences = await Measurement.findAll({
    include: [
      {
        association: "athleteTest",
        required: true,
        ...(excludeAthleteTestId
          ? { where: { id: { [Op.ne]: excludeAthleteTestId } } }
          : {}),
        include: [
          {
            association: "athlete",
            required: true,
            where: { birth_year: birthYear, gender },
          },
        ],
      },
    ],
  });

  const historicalReferences = await HistoricalAthleteData.findAll({
    where: { birth_year: birthYear, gender },
  });

  return [
    ...measurementReferences.map(mapMeasurementToReferenceData),
    ...historicalReferences.map(mapHistoricalToReferenceData),
  ];
}

export function calculateDerivedMetrics(measurement: Measurement) {
  const height = Number(measurement.height) || 0;
  const weight = Number(measurement.weight) || 0;
  const normalizedSprints = normalizeSprintMeasurements(
    measurement.sprint_30m,
    measurement.sprint_30m_second,
  );
  return {
    bmi: calculateBMI(height, weight),
    ffmi: calculateFFMI(height, weight),
    fatigueIndex: calculateFatigueIndex(
      normalizedSprints.sprint30m ?? 0,
      normalizedSprints.sprint30mSecond ?? 0,
    ),
  };
}

export function calculateAllPercentiles(
  measurement: any,
  referenceData: ReferenceAthleteData[],
) {
  const percentiles: Record<string, number | null> = {};
  const metrics = [
    "height",
    "weight",
    "bmi",
    "flexibility",
    "sprint_30m",
    "sprint_30m_second",
    "agility",
    "vertical_jump",
    "pass_count",
    "ffmi",
    "fatigue_index",
  ];

  for (const metric of metrics) {
    const config = METRIC_CONFIG[metric];
    if (!config) continue;
    const athleteValue = Number(measurement[metric]) || null;
    const referenceValues = referenceData.map((ref: any) =>
      ref[metric] !== null ? Number(ref[metric]) : null,
    );

    percentiles[metric] = calculatePercentile(
      athleteValue,
      referenceValues,
      config.lowerIsBetter,
    );
  }
  return percentiles;
}

export function calculateOverallPerformance(
  percentiles: Record<string, number | null>,
): number {
  const validPercentiles = Object.values(percentiles).filter(
    (p): p is number => p !== null,
  );
  if (validPercentiles.length === 0) return 50;
  return Math.round(
    validPercentiles.reduce((acc, p) => acc + p, 0) / validPercentiles.length,
  );
}

export function calculateFourMonthTargets(
  percentiles: Record<string, number | null>,
) {
  const targets: Record<string, number | null> = {};
  for (const [metric, percentile] of Object.entries(percentiles)) {
    targets[metric] =
      percentile === null ? null : Math.min(99, percentile + 10);
  }
  return targets;
}

// Custom error for missing benchmark data
export class NoBenchmarkDataError extends Error {
  constructor(birthYear: number) {
    super(`Bu yaş grubu (${birthYear}) için benchmark verisi bulunamadı`);
    this.name = "NoBenchmarkDataError";
  }
}

export interface AthleteReport {
  athleteId: string;
  athleteTestId: string;
  fullName: string;
  birthYear: number;
  measurements: Record<string, number | null>;
  percentiles: Record<string, number | null>;
  fourMonthTargets: Record<string, number | null>;
  overallPerformance: number;
  referenceCount: number;
}

export async function generateAthleteReport(
  athleteTest: any,
  measurement: Measurement,
): Promise<AthleteReport> {
  const athlete = athleteTest.athlete;
  const referenceData = await getReferenceDataByBirthYear(
    athlete.birth_year,
    athlete.gender,
    athleteTest.id,
  );

  // Guard: Check if benchmark data exists for this birth year
  if (referenceData.length === 0) {
    throw new NoBenchmarkDataError(athlete.birth_year);
  }

  const derived = calculateDerivedMetrics(measurement);

  const fullMeasurement = {
    height: measurement.height,
    weight: measurement.weight,
    flexibility: measurement.flexibility,
    sprint_30m: measurement.sprint_30m,
    sprint_30m_second: measurement.sprint_30m_second,
    agility: measurement.agility,
    vertical_jump: measurement.vertical_jump,
    pass_count: measurement.pass_count,
    bmi: derived.bmi,
    ffmi: measurement.ffmi,
    fatigue_index: derived.fatigueIndex,
  };

  const percentiles = calculateAllPercentiles(fullMeasurement, referenceData);
  const overallPerformance = calculateOverallPerformance(percentiles);
  const fourMonthTargets = calculateFourMonthTargets(percentiles);

  return {
    athleteId: athlete.id,
    athleteTestId: athleteTest.id,
    fullName: athlete.full_name,
    birthYear: athlete.birth_year,
    measurements: {
      height: measurement.height,
      weight: measurement.weight,
      flexibility: measurement.flexibility,
      sprint30m: measurement.sprint_30m,
      sprint30mSecond: measurement.sprint_30m_second,
      agility: measurement.agility,
      verticalJump: measurement.vertical_jump,
      passCount: measurement.pass_count,
      bmi: derived.bmi,
      ffmi: measurement.ffmi,
      fatigueIndex: derived.fatigueIndex,
    },
    percentiles,
    fourMonthTargets,
    overallPerformance,
    referenceCount: referenceData.length,
  };
}

// ============================================
// FRONTEND-COMPATIBLE TYPES AND FUNCTIONS
// ============================================

/**
 * Single metric result structure for frontend
 */
export interface MetricResult {
  value: number | null;
  score?: number | null;
  percentile: number | null;
  target: number | null;
}

/**
 * Frontend-compatible athlete report structure
 * Field names match exactly what frontend expects
 */
export interface FrontendAthleteReport {
  athleteId: string;
  fullName: string;
  birthYear: number;
  measurements?: {
    height?: number;
    weight?: number;
    bmi?: number;
    ffmi?: number;
    flexibility?: number;
    sprint30m?: number;
    sprint30mSecond?: number;
    agility?: number;
    verticalJump?: number;
    passCount?: number;
    handgrip?: number;
    handgripCategory?: "Ortalama" | "İyi" | "Çok İyi";
  };
  ageGroupAverages: {
    sprint1: number | null;
    sprint2: number | null;
    agility: number | null;
    flexibility: number | null;
    verticalJump: number | null;
    passCount: number | null;
    bmi: number | null;
  };
  ageGroupPercentiles: {
    sprint1: number | null;
    sprint2: number | null;
    agility: number | null;
    flexibility: number | null;
    verticalJump: number | null;
    passCount: number | null;
    bmi: number | null;
  };
  metrics: {
    sprint1: MetricResult;
    sprint2: MetricResult;
    agility: MetricResult;
    flexibility: MetricResult;
    verticalJump: MetricResult;
    passCount: MetricResult;
    bmi: MetricResult;
    fatigueIndex: MetricResult;
  };
  youjiSummary?: {
    deviceReportUrl: string;
    reportId: string;
    measurementTime?: string;
    bodyFatPercent?: number;
    mineralAmount?: number;
    proteinAmount?: number;
  };
  overallPerformance: number;
}

function average(values: (number | null | undefined)[]): number | null {
  const validValues = values
    .map((value) => (value === null || value === undefined ? null : Number(value)))
    .filter((value): value is number => value !== null && !isNaN(value));

  if (validValues.length === 0) return null;

  return Number(
    (
      validValues.reduce((total, value) => total + value, 0) / validValues.length
    ).toFixed(2),
  );
}

function calculateAgeGroupAverages(
  referenceData: ReferenceAthleteData[],
  birthYear: number,
): FrontendAthleteReport["ageGroupAverages"] {
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  const passTarget = Math.max(12, Math.min(32, 10 + age * 1.15));

  return {
    sprint1: average(referenceData.map((ref) => ref.sprint_30m)),
    sprint2: average(referenceData.map((ref) => ref.sprint_30m_second)),
    agility: average(referenceData.map((ref) => ref.agility)),
    flexibility: average(referenceData.map((ref) => ref.flexibility)),
    verticalJump: average(referenceData.map((ref) => ref.vertical_jump)),
    passCount:
      average(referenceData.map((ref) => ref.pass_count)) ??
      Number(passTarget.toFixed(0)),
    bmi: average(
      referenceData.map((ref) =>
        ref.height && ref.weight ? calculateBMI(Number(ref.height), Number(ref.weight)) : null,
      ),
    ),
  };
}

function calculateAgeGroupPercentiles(
  referenceData: ReferenceAthleteData[],
  ageGroupAverages: FrontendAthleteReport["ageGroupAverages"],
): FrontendAthleteReport["ageGroupPercentiles"] {
  return {
    sprint1: calculatePercentile(
      ageGroupAverages.sprint1,
      referenceData.map((ref) => ref.sprint_30m),
      true,
    ),
    sprint2: calculatePercentile(
      ageGroupAverages.sprint2,
      referenceData.map((ref) => ref.sprint_30m_second),
      true,
    ),
    agility: calculatePercentile(
      ageGroupAverages.agility,
      referenceData.map((ref) => ref.agility),
      true,
    ),
    flexibility: calculatePercentile(
      ageGroupAverages.flexibility,
      referenceData.map((ref) => ref.flexibility),
    ),
    verticalJump: calculatePercentile(
      ageGroupAverages.verticalJump,
      referenceData.map((ref) => ref.vertical_jump),
    ),
    passCount: calculatePercentile(
      ageGroupAverages.passCount,
      referenceData.map((ref) => ref.pass_count),
    ),
    bmi: calculatePercentile(
      ageGroupAverages.bmi,
      referenceData.map((ref) => ref.bmi),
    ),
  };
}

function buildFallbackInput(
  athleteTest: any,
  athlete: any,
  metricKey: string,
  value: number | null,
) {
  return {
    birthYear: athlete.birth_year,
    gender: athlete.gender as AthleteGender,
    sportType: athleteTest.testSession?.sport_type,
    metricKey,
    value,
  };
}

function applyFallbackAverages(
  athleteTest: any,
  athlete: any,
  ageGroupAverages: FrontendAthleteReport["ageGroupAverages"],
): FrontendAthleteReport["ageGroupAverages"] {
  const fallbackAverage = (metricKey: string) =>
    getFallbackAverage({
      birthYear: athlete.birth_year,
      gender: athlete.gender as AthleteGender,
      sportType: athleteTest.testSession?.sport_type,
      metricKey,
    });
  const fallbackHeight = fallbackAverage("height");
  const fallbackWeight = fallbackAverage("weight");
  const fallbackBmi =
    fallbackHeight && fallbackWeight
      ? calculateBMI(fallbackHeight, fallbackWeight)
      : null;

  return {
    sprint1: ageGroupAverages.sprint1 ?? fallbackAverage("sprint_30m"),
    sprint2:
      ageGroupAverages.sprint2 ?? fallbackAverage("sprint_30m_second"),
    agility: ageGroupAverages.agility ?? fallbackAverage("agility"),
    flexibility:
      ageGroupAverages.flexibility ?? fallbackAverage("flexibility"),
    verticalJump:
      ageGroupAverages.verticalJump ?? fallbackAverage("vertical_jump"),
    passCount:
      ageGroupAverages.passCount ??
      fallbackAverage("pass_count") ??
      (athlete.gender === "female"
        ? null
        : Number(
            Math.max(
              12,
              Math.min(32, 10 + (new Date().getFullYear() - athlete.birth_year) * 1.15),
            ).toFixed(0),
          )),
    bmi: ageGroupAverages.bmi ?? fallbackBmi,
  };
}

function buildFallbackAverageScore(
  athleteTest: any,
  athlete: any,
  metricKey: string,
  averageValue: number | null,
): number | null {
  return calculateFallbackScore(
    buildFallbackInput(athleteTest, athlete, metricKey, averageValue),
  );
}

/**
 * Generate a frontend-compatible athlete report
 * Returns partial data with null percentiles if benchmark data is missing
 */
export async function generateFrontendAthleteReport(
  athleteTest: any,
  measurement: Measurement | null,
): Promise<FrontendAthleteReport> {
  const athlete = athleteTest.athlete;
  const athleteGender = athlete.gender as AthleteGender;

  // If no measurement, return empty metrics
  if (!measurement) {
    return {
      athleteId: athlete.id,
      fullName: athlete.full_name,
      birthYear: athlete.birth_year,
      measurements: {},
      ageGroupAverages: {
        sprint1: null,
        sprint2: null,
        agility: null,
        flexibility: null,
        verticalJump: null,
        passCount: null,
        bmi: null,
      },
      ageGroupPercentiles: {
        sprint1: null,
        sprint2: null,
        agility: null,
        flexibility: null,
        verticalJump: null,
        passCount: null,
        bmi: null,
      },
      metrics: {
        sprint1: { value: null, score: null, percentile: null, target: null },
        sprint2: { value: null, score: null, percentile: null, target: null },
        agility: { value: null, score: null, percentile: null, target: null },
        flexibility: { value: null, score: null, percentile: null, target: null },
        verticalJump: { value: null, score: null, percentile: null, target: null },
        passCount: { value: null, score: null, percentile: null, target: null },
        bmi: { value: null, score: null, percentile: null, target: null },
        fatigueIndex: { value: null, score: null, percentile: null, target: null },
      },
      overallPerformance: 0,
    };
  }

  // Calculate derived metrics
  const derived = calculateDerivedMetrics(measurement);

  // Build full measurement object for percentile calculation
  const normalizedSprints = normalizeSprintMeasurements(
    measurement.sprint_30m,
    measurement.sprint_30m_second,
  );
  const fullMeasurement = {
    sprint_30m: normalizedSprints.sprint30m,
    sprint_30m_second: normalizedSprints.sprint30mSecond,
    agility:
      measurement.agility !== null && measurement.agility !== undefined
        ? Number(measurement.agility)
        : null,
    flexibility:
      measurement.flexibility !== null && measurement.flexibility !== undefined
        ? Number(measurement.flexibility)
        : null,
    vertical_jump:
      measurement.vertical_jump !== null && measurement.vertical_jump !== undefined
        ? Number(measurement.vertical_jump)
        : null,
    pass_count:
      measurement.pass_count !== null && measurement.pass_count !== undefined
        ? Number(measurement.pass_count)
        : null,
    bmi: derived.bmi,
    fatigue_index: derived.fatigueIndex,
  };
  const repository = createAgeGroupMetricRepository(athleteTest.id);
  const comparison = await calculateAgeGroupMetricComparisons({
    birthYear: athlete.birth_year,
    gender: athleteGender,
    athleteMetrics: fullMeasurement,
    repository,
    metricConfig: REPORT_METRIC_CONFIG,
  });

  const metricResults = Object.fromEntries(
    comparison.metrics.map((metric) => [metric.metricKey, metric]),
  );

  const databaseAgeGroupAverages = await buildAgeGroupAveragesFromDatabase(
    athlete.birth_year,
    athleteGender,
    athleteTest.id,
  );
  const ageGroupAverages = applyFallbackAverages(
    athleteTest,
    athlete,
    databaseAgeGroupAverages,
  );
  const databaseAgeGroupPercentiles = await buildAgeGroupAverageScores(
    athlete.birth_year,
    athleteGender,
    athleteTest.id,
    ageGroupAverages,
  );
  const ageGroupPercentiles: FrontendAthleteReport["ageGroupPercentiles"] = {
    sprint1:
      databaseAgeGroupPercentiles.sprint1 ??
      buildFallbackAverageScore(
        athleteTest,
        athlete,
        "sprint_30m",
        ageGroupAverages.sprint1,
      ),
    sprint2:
      databaseAgeGroupPercentiles.sprint2 ??
      buildFallbackAverageScore(
        athleteTest,
        athlete,
        "sprint_30m_second",
        ageGroupAverages.sprint2,
      ),
    agility:
      databaseAgeGroupPercentiles.agility ??
      buildFallbackAverageScore(
        athleteTest,
        athlete,
        "agility",
        ageGroupAverages.agility,
      ),
    flexibility:
      databaseAgeGroupPercentiles.flexibility ??
      buildFallbackAverageScore(
        athleteTest,
        athlete,
        "flexibility",
        ageGroupAverages.flexibility,
      ),
    verticalJump:
      databaseAgeGroupPercentiles.verticalJump ??
      buildFallbackAverageScore(
        athleteTest,
        athlete,
        "vertical_jump",
        ageGroupAverages.verticalJump,
      ),
    passCount:
      databaseAgeGroupPercentiles.passCount ??
      buildFallbackAverageScore(
        athleteTest,
        athlete,
        "pass_count",
        ageGroupAverages.passCount,
      ),
    bmi: databaseAgeGroupPercentiles.bmi ?? null,
  };

  const buildMetric = (
    value: number | null,
    metricKey: ReportMetricKey,
  ): MetricResult => {
    const result = metricResults[metricKey];
    const score =
      result?.status === COMPARISON_RESULT_STATUS.SCORED
        ? result.score
        : calculateFallbackScore(
            buildFallbackInput(athleteTest, athlete, metricKey, value),
          );
    const percentileRank =
      result?.status === COMPARISON_RESULT_STATUS.SCORED
        ? result.percentileRank
        : score !== null
        ? Number((100 - score).toFixed(1))
        : null;

    return {
      value,
      score,
      percentile: percentileRank,
      target: score !== null ? Math.min(100, score + 10) : null,
    };
  };

  const metrics = {
    sprint1: buildMetric(fullMeasurement.sprint_30m, "sprint_30m"),
    sprint2: buildMetric(fullMeasurement.sprint_30m_second, "sprint_30m_second"),
    agility: buildMetric(fullMeasurement.agility, "agility"),
    flexibility: buildMetric(fullMeasurement.flexibility, "flexibility"),
    verticalJump: buildMetric(fullMeasurement.vertical_jump, "vertical_jump"),
    passCount: {
      value: fullMeasurement.pass_count,
      score:
        calculateFallbackScore(
          buildFallbackInput(
            athleteTest,
            athlete,
            "pass_count",
            fullMeasurement.pass_count,
          ),
        ) ?? buildMetric(fullMeasurement.pass_count, "pass_count").score,
      percentile: (() => {
        const benchmarkScore = calculateFallbackScore(
          buildFallbackInput(
            athleteTest,
            athlete,
            "pass_count",
            fullMeasurement.pass_count,
          ),
        );
        return benchmarkScore !== null
          ? Number((100 - benchmarkScore).toFixed(1))
          : buildMetric(fullMeasurement.pass_count, "pass_count").percentile;
      })(),
      target:
        fullMeasurement.pass_count !== null
          ? Math.ceil(fullMeasurement.pass_count * 1.12)
          : null,
    },
    bmi: buildMetric(derived.bmi, "bmi"),
    fatigueIndex: buildMetric(derived.fatigueIndex, "fatigue_index"),
  };

  const scoredMetrics = Object.values(metrics)
    .map((metric) => metric.score)
    .filter((score): score is number => score !== null && score !== undefined);
  const overallPerformance =
    comparison.overall.overallPercentileRank ??
    (scoredMetrics.length > 0
      ? Number(
          (
            scoredMetrics.reduce((sum, score) => sum + score, 0) /
            scoredMetrics.length
          ).toFixed(1),
        )
      : 0);

  return {
    athleteId: athlete.id,
    fullName: athlete.full_name,
    birthYear: athlete.birth_year,
    measurements: {
      height:
        measurement.height !== null && measurement.height !== undefined
          ? Number(measurement.height)
          : undefined,
      weight:
        measurement.weight !== null && measurement.weight !== undefined
          ? Number(measurement.weight)
          : undefined,
      bmi: derived.bmi ?? undefined,
      ffmi:
        measurement.ffmi !== null && measurement.ffmi !== undefined
          ? Number(measurement.ffmi)
          : undefined,
      flexibility: fullMeasurement.flexibility ?? undefined,
      sprint30m: fullMeasurement.sprint_30m ?? undefined,
      sprint30mSecond: fullMeasurement.sprint_30m_second ?? undefined,
      agility: fullMeasurement.agility ?? undefined,
      verticalJump: fullMeasurement.vertical_jump ?? undefined,
      passCount: fullMeasurement.pass_count ?? undefined,
      handgrip:
        measurement.handgrip !== null && measurement.handgrip !== undefined
          ? Number(measurement.handgrip)
          : undefined,
      handgripCategory:
        classifyHandgrip(
          athlete.birth_year,
          athleteGender,
          measurement.handgrip,
        ) ?? undefined,
    },
    ageGroupAverages,
    ageGroupPercentiles,
    metrics,
    overallPerformance,
  };
}
