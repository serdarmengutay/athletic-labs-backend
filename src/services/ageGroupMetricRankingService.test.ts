import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPARISON_RESULT_STATUS,
  MetricDistributionStats,
  calculateAgeGroupMetricComparisons,
  calculateMetricComparisonFromStats,
  calculateOverallComparison,
} from "./ageGroupMetricRankingService";
import {
  METRIC_DIRECTIONS,
  MetricConfigMap,
  TIE_STRATEGIES,
} from "../config/metricConfig";
import { ATHLETE_GENDERS } from "../config/gender";

const TEST_METRIC_CONFIG: MetricConfigMap = {
  sprint_30m: {
    label: "30m Sprint",
    unit: "second",
    direction: METRIC_DIRECTIONS.LOWER_IS_BETTER,
    weight: 1,
    minSampleSize: 5,
    tieStrategy: TIE_STRATEGIES.MIDPOINT,
    scorePrecision: 1,
    percentilePrecision: 1,
    validRange: { min: 2, max: 20 },
  },
  vertical_jump: {
    label: "Dikey Sıçrama",
    unit: "cm",
    direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    weight: 2,
    minSampleSize: 5,
    tieStrategy: TIE_STRATEGIES.MIDPOINT,
    scorePrecision: 1,
    percentilePrecision: 1,
    validRange: { min: 5, max: 120 },
  },
};

test("calculateMetricComparisonFromStats calculates lower_is_better metric correctly", () => {
  const stats: MetricDistributionStats = {
    groupSize: 1000,
    betterPerformerCount: 220,
    worsePerformerCount: 780,
    equalValueCount: 0,
  };

  const result = calculateMetricComparisonFromStats(
    "sprint_30m",
    5.12,
    stats,
    TEST_METRIC_CONFIG.sprint_30m,
  );

  assert.equal(result.status, COMPARISON_RESULT_STATUS.SCORED);
  assert.equal(result.rank, 221);
  assert.equal(result.betterThanCount, 780);
  assert.equal(result.score, 78);
  assert.equal(result.percentileRank, 22);
});

test("calculateMetricComparisonFromStats applies midpoint tie handling deterministically", () => {
  const stats: MetricDistributionStats = {
    groupSize: 100,
    betterPerformerCount: 20,
    worsePerformerCount: 70,
    equalValueCount: 10,
  };

  const result = calculateMetricComparisonFromStats(
    "vertical_jump",
    42,
    stats,
    TEST_METRIC_CONFIG.vertical_jump,
  );

  assert.equal(result.status, COMPARISON_RESULT_STATUS.SCORED);
  assert.equal(result.rank, 21);
  assert.equal(result.betterThanCount, 70);
  assert.equal(result.tieCount, 10);
  assert.equal(result.score, 75);
  assert.equal(result.percentileRank, 25);
});

test("calculateMetricComparisonFromStats returns insufficient_sample when group is too small", () => {
  const stats: MetricDistributionStats = {
    groupSize: 4,
    betterPerformerCount: 1,
    worsePerformerCount: 2,
    equalValueCount: 1,
  };

  const result = calculateMetricComparisonFromStats(
    "sprint_30m",
    5.2,
    stats,
    TEST_METRIC_CONFIG.sprint_30m,
  );

  assert.equal(result.status, COMPARISON_RESULT_STATUS.INSUFFICIENT_SAMPLE);
  assert.equal(result.score, null);
  assert.equal(result.percentileRank, null);
});

test("calculateMetricComparisonFromStats rejects invalid values by config range", () => {
  const stats: MetricDistributionStats = {
    groupSize: 100,
    betterPerformerCount: 0,
    worsePerformerCount: 0,
    equalValueCount: 0,
  };

  const result = calculateMetricComparisonFromStats(
    "sprint_30m",
    50,
    stats,
    TEST_METRIC_CONFIG.sprint_30m,
  );

  assert.equal(result.status, COMPARISON_RESULT_STATUS.INVALID_VALUE);
  assert.equal(result.score, null);
});

test("calculateOverallComparison computes weighted average from scored metrics only", () => {
  const overall = calculateOverallComparison([
    {
      metricKey: "sprint_30m",
      label: "30m Sprint",
      rawValue: 5.12,
      direction: METRIC_DIRECTIONS.LOWER_IS_BETTER,
      unit: "second",
      weight: 1,
      status: COMPARISON_RESULT_STATUS.SCORED,
      groupSize: 1000,
      rank: 221,
      betterPerformerCount: 220,
      betterThanCount: 780,
      tieCount: 0,
      score: 78,
      percentileRank: 22,
    },
    {
      metricKey: "vertical_jump",
      label: "Dikey Sıçrama",
      rawValue: 38,
      direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
      unit: "cm",
      weight: 2,
      status: COMPARISON_RESULT_STATUS.SCORED,
      groupSize: 1000,
      rank: 301,
      betterPerformerCount: 300,
      betterThanCount: 650,
      tieCount: 0,
      score: 65,
      percentileRank: 35,
    },
  ]);

  assert.equal(overall.status, "scored");
  assert.equal(overall.overallScore, 69.3);
  assert.equal(overall.overallPercentileRank, 30.7);
});

test("calculateAgeGroupMetricComparisons orchestrates repository calls and skips missing values", async () => {
  const repositoryCalls: string[] = [];
  const repository = {
    async getMetricDistributionStats({
      metricKey,
    }: {
      birthYear: number;
      gender: typeof ATHLETE_GENDERS.MALE;
      metricKey: string;
      metricValue: number;
    }): Promise<MetricDistributionStats> {
      repositoryCalls.push(metricKey);

      if (metricKey === "sprint_30m") {
        return {
          groupSize: 1000,
          betterPerformerCount: 220,
          worsePerformerCount: 780,
          equalValueCount: 0,
        };
      }

      return {
        groupSize: 1000,
        betterPerformerCount: 300,
        worsePerformerCount: 650,
        equalValueCount: 0,
      };
    },
  };

  const response = await calculateAgeGroupMetricComparisons({
    birthYear: 2013,
    gender: ATHLETE_GENDERS.MALE,
    athleteMetrics: {
      sprint_30m: 5.12,
      vertical_jump: 38,
    },
    repository,
    metricConfig: TEST_METRIC_CONFIG,
  });

  assert.deepEqual(repositoryCalls.sort(), ["sprint_30m", "vertical_jump"]);
  assert.equal(response.metrics[0].status, COMPARISON_RESULT_STATUS.SCORED);
  assert.equal(response.metrics[1].status, COMPARISON_RESULT_STATUS.SCORED);
  assert.equal(response.overall.status, "scored");
});
