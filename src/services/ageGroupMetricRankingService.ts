import {
  DEFAULT_COMPARISON_THRESHOLDS,
  METRIC_CONFIG,
  MetricConfigEntry,
  MetricConfigMap,
  MetricDirection,
  TIE_STRATEGIES,
} from "../config/metricConfig";
import { AthleteGender } from "../config/gender";

export const COMPARISON_RESULT_STATUS = {
  SCORED: "scored",
  MISSING_VALUE: "missing_value",
  INVALID_VALUE: "invalid_value",
  INSUFFICIENT_SAMPLE: "insufficient_sample",
} as const;

export type ComparisonResultStatus =
  (typeof COMPARISON_RESULT_STATUS)[keyof typeof COMPARISON_RESULT_STATUS];

export interface MetricDistributionStats {
  groupSize: number;
  betterPerformerCount: number;
  worsePerformerCount: number;
  equalValueCount: number;
}

export interface MetricQueryInput {
  birthYear: number;
  gender: AthleteGender;
  metricKey: string;
  metricValue: number;
}

export interface AgeGroupMetricRepository {
  getMetricDistributionStats(
    input: MetricQueryInput,
  ): Promise<MetricDistributionStats>;
}

export interface MetricComparisonResult {
  metricKey: string;
  label: string;
  rawValue: number | null;
  direction: MetricDirection;
  unit: string;
  weight: number;
  status: ComparisonResultStatus;
  groupSize: number;
  rank: number | null;
  betterPerformerCount: number;
  betterThanCount: number;
  tieCount: number;
  score: number | null;
  percentileRank: number | null;
}

export interface OverallComparisonResult {
  status: "scored" | "insufficient_metrics";
  metricCount: number;
  scoredMetricCount: number;
  overallScore: number | null;
  overallPercentileRank: number | null;
}

export interface AthleteMetricInput {
  [metricKey: string]: number | null | undefined;
}

export interface AgeGroupComparisonResponse {
  birthYear: number;
  gender: AthleteGender;
  metrics: MetricComparisonResult[];
  overall: OverallComparisonResult;
}

function roundToPrecision(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

function isWithinValidRange(
  value: number,
  config: MetricConfigEntry,
): boolean {
  const { validRange } = config;

  if (!validRange) return true;
  if (validRange.min !== undefined && value < validRange.min) return false;
  if (validRange.max !== undefined && value > validRange.max) return false;

  return true;
}

function validateMetricValue(
  metricKey: string,
  rawValue: number | null | undefined,
  config: MetricConfigEntry,
): MetricComparisonResult | null {
  if (!isFiniteNumber(rawValue)) {
    return {
      metricKey,
      label: config.label,
      rawValue: rawValue ?? null,
      direction: config.direction,
      unit: config.unit,
      weight: config.weight,
      status: COMPARISON_RESULT_STATUS.MISSING_VALUE,
      groupSize: 0,
      rank: null,
      betterPerformerCount: 0,
      betterThanCount: 0,
      tieCount: 0,
      score: null,
      percentileRank: null,
    };
  }

  if (!isWithinValidRange(rawValue, config)) {
    return {
      metricKey,
      label: config.label,
      rawValue,
      direction: config.direction,
      unit: config.unit,
      weight: config.weight,
      status: COMPARISON_RESULT_STATUS.INVALID_VALUE,
      groupSize: 0,
      rank: null,
      betterPerformerCount: 0,
      betterThanCount: 0,
      tieCount: 0,
      score: null,
      percentileRank: null,
    };
  }

  return null;
}

function computeTieAdjustedBetterThanCount(
  worsePerformerCount: number,
  equalValueCount: number,
  tieStrategy: MetricConfigEntry["tieStrategy"],
): number {
  if (tieStrategy === TIE_STRATEGIES.STRICT) {
    return worsePerformerCount;
  }

  return worsePerformerCount + equalValueCount / 2;
}

export function calculateMetricComparisonFromStats(
  metricKey: string,
  rawValue: number | null | undefined,
  stats: MetricDistributionStats,
  config: MetricConfigEntry,
): MetricComparisonResult {
  const validationError = validateMetricValue(metricKey, rawValue, config);
  if (validationError) return validationError;
  if (!isFiniteNumber(rawValue)) {
    throw new Error(`Validated metric "${metricKey}" must be numeric`);
  }
  const metricValue = rawValue;

  if (stats.groupSize < config.minSampleSize) {
    return {
      metricKey,
      label: config.label,
      rawValue: metricValue,
      direction: config.direction,
      unit: config.unit,
      weight: config.weight,
      status: COMPARISON_RESULT_STATUS.INSUFFICIENT_SAMPLE,
      groupSize: stats.groupSize,
      rank: null,
      betterPerformerCount: stats.betterPerformerCount,
      betterThanCount: stats.worsePerformerCount,
      tieCount: stats.equalValueCount,
      score: null,
      percentileRank: null,
    };
  }

  const tieAdjustedBetterThanCount = computeTieAdjustedBetterThanCount(
    stats.worsePerformerCount,
    stats.equalValueCount,
    config.tieStrategy,
  );

  const rawScore =
    (tieAdjustedBetterThanCount / stats.groupSize) * 100;
  const score = roundToPrecision(rawScore, config.scorePrecision);
  const percentileRank = roundToPrecision(
    100 - score,
    config.percentilePrecision,
  );

  return {
    metricKey,
    label: config.label,
    rawValue: metricValue,
    direction: config.direction,
    unit: config.unit,
    weight: config.weight,
    status: COMPARISON_RESULT_STATUS.SCORED,
    groupSize: stats.groupSize,
    rank: stats.betterPerformerCount + 1,
    betterPerformerCount: stats.betterPerformerCount,
    betterThanCount: stats.worsePerformerCount,
    tieCount: stats.equalValueCount,
    score,
    percentileRank,
  };
}

export function calculateOverallComparison(
  metricResults: MetricComparisonResult[],
  overallScorePrecision = DEFAULT_COMPARISON_THRESHOLDS.scorePrecision,
  overallPercentilePrecision = DEFAULT_COMPARISON_THRESHOLDS.percentilePrecision,
): OverallComparisonResult {
  const scoredMetrics = metricResults.filter(
    (result) => result.status === COMPARISON_RESULT_STATUS.SCORED,
  );

  const totalWeight = scoredMetrics.reduce(
    (sum, result) => sum + result.weight,
    0,
  );

  if (scoredMetrics.length === 0 || totalWeight === 0) {
    return {
      status: "insufficient_metrics",
      metricCount: metricResults.length,
      scoredMetricCount: 0,
      overallScore: null,
      overallPercentileRank: null,
    };
  }

  const weightedScoreSum = scoredMetrics.reduce((sum, result) => {
    return sum + (result.score ?? 0) * result.weight;
  }, 0);

  const overallScore = roundToPrecision(
    weightedScoreSum / totalWeight,
    overallScorePrecision,
  );
  const overallPercentileRank = roundToPrecision(
    100 - overallScore,
    overallPercentilePrecision,
  );

  return {
    status: "scored",
    metricCount: metricResults.length,
    scoredMetricCount: scoredMetrics.length,
    overallScore,
    overallPercentileRank,
  };
}

export async function calculateAgeGroupMetricComparisons(params: {
  birthYear: number;
  gender: AthleteGender;
  athleteMetrics: AthleteMetricInput;
  repository: AgeGroupMetricRepository;
  metricConfig?: MetricConfigMap;
}): Promise<AgeGroupComparisonResponse> {
  const {
    birthYear,
    gender,
    athleteMetrics,
    repository,
    metricConfig = METRIC_CONFIG,
  } = params;

  const metricEntries = Object.entries(metricConfig);

  const metrics = await Promise.all(
    metricEntries.map(async ([metricKey, config]) => {
      const rawValue = athleteMetrics[metricKey];
      const validationError = validateMetricValue(metricKey, rawValue, config);

      if (validationError) {
        return validationError;
      }
      if (!isFiniteNumber(rawValue)) {
        throw new Error(`Validated metric "${metricKey}" must be numeric`);
      }
      const metricValue = rawValue;

      const stats = await repository.getMetricDistributionStats({
        birthYear,
        gender,
        metricKey,
        metricValue,
      });

      return calculateMetricComparisonFromStats(
        metricKey,
        metricValue,
        stats,
        config,
      );
    }),
  );

  return {
    birthYear,
    gender,
    metrics,
    overall: calculateOverallComparison(metrics),
  };
}

export function buildCountBasedQueryGuidance(): string[] {
  return [
    "Use a long-format benchmark_metrics table with columns: birth_year, gender, metric_key, metric_value.",
    "Create a composite index on (birth_year, gender, metric_key, metric_value).",
    "For each metric query only aggregate counts, never fetch the full cohort into memory.",
    `Require at least ${DEFAULT_COMPARISON_THRESHOLDS.minSampleSize} valid measurements per birth_year + gender + metric_key group.`,
    "For lower_is_better metrics count better performers with metric_value < athleteValue and worse performers with metric_value > athleteValue.",
    "For higher_is_better metrics count better performers with metric_value > athleteValue and worse performers with metric_value < athleteValue.",
  ];
}
