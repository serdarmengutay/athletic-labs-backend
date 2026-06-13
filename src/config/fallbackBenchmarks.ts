import { AthleteGender } from "./gender";
import { METRIC_DIRECTIONS, MetricDirection } from "./metricConfig";

export type FallbackSport = "football" | "volleyball_girls";

export interface FallbackBenchmarkRange {
  min: number;
  max: number;
  direction: MetricDirection;
  average?: number;
  thresholds?: {
    low: number;
    mid: number;
    good: number;
  };
}

export type FallbackBenchmarkMetrics = Partial<
  Record<string, FallbackBenchmarkRange>
>;

const footballByBirthYear: Record<number, FallbackBenchmarkMetrics> = {
  2011: {
    sprint_30m: { min: 4.45, max: 5.75, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    sprint_30m_second: { min: 4.55, max: 5.85, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    agility: { min: 17.0, max: 18.5, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    vertical_jump: { min: 32, max: 40, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    flexibility: { min: 0, max: 15, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    pass_count: {
      min: 15,
      max: 27,
      average: 21,
      thresholds: { low: 15, mid: 21, good: 27 },
      direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    },
    height: { min: 154, max: 160, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    weight: { min: 40, max: 50, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
  },
  2012: {
    sprint_30m: { min: 4.6, max: 5.1, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    sprint_30m_second: { min: 4.7, max: 5.2, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    agility: { min: 17.5, max: 19.0, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    vertical_jump: { min: 30, max: 38, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    flexibility: { min: 0, max: 14, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    pass_count: {
      min: 15,
      max: 27,
      average: 21,
      thresholds: { low: 15, mid: 21, good: 27 },
      direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    },
    height: { min: 150, max: 156, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    weight: { min: 38, max: 48, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
  },
  2013: {
    sprint_30m: { min: 4.7, max: 5.2, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    sprint_30m_second: { min: 4.8, max: 5.3, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    agility: { min: 18.0, max: 19.5, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    vertical_jump: { min: 28, max: 36, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    flexibility: { min: 0, max: 14, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    pass_count: {
      min: 12,
      max: 24,
      average: 18,
      thresholds: { low: 12, mid: 18, good: 24 },
      direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    },
    height: { min: 146, max: 152, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    weight: { min: 35, max: 45, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
  },
  2014: {
    sprint_30m: { min: 4.8, max: 5.3, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    sprint_30m_second: { min: 4.9, max: 5.4, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    agility: { min: 18.5, max: 20.0, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    vertical_jump: { min: 26, max: 34, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    flexibility: { min: 0, max: 13, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    pass_count: {
      min: 12,
      max: 24,
      average: 18,
      thresholds: { low: 12, mid: 18, good: 24 },
      direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    },
    height: { min: 142, max: 148, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    weight: { min: 32, max: 42, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
  },
  2015: {
    sprint_30m: { min: 4.9, max: 5.4, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    sprint_30m_second: { min: 5.0, max: 5.5, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    agility: { min: 19.0, max: 20.5, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    vertical_jump: { min: 24, max: 32, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    flexibility: { min: 0, max: 13, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    pass_count: {
      min: 10,
      max: 20,
      average: 15,
      thresholds: { low: 10, mid: 15, good: 20 },
      direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    },
    height: { min: 138, max: 144, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    weight: { min: 30, max: 40, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
  },
  2016: {
    sprint_30m: { min: 5.0, max: 5.5, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    sprint_30m_second: { min: 5.1, max: 5.6, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    agility: { min: 19.5, max: 21.0, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    vertical_jump: { min: 22, max: 30, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    flexibility: { min: 0, max: 12, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    pass_count: {
      min: 10,
      max: 20,
      average: 15,
      thresholds: { low: 10, mid: 15, good: 20 },
      direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    },
    height: { min: 134, max: 140, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    weight: { min: 28, max: 38, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
  },
  2017: {
    sprint_30m: { min: 5.1, max: 5.6, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    sprint_30m_second: { min: 5.2, max: 5.7, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    agility: { min: 20.0, max: 21.5, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    vertical_jump: { min: 20, max: 28, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    flexibility: { min: 0, max: 12, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    pass_count: {
      min: 8,
      max: 16,
      average: 12,
      thresholds: { low: 8, mid: 12, good: 16 },
      direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    },
    height: { min: 130, max: 136, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    weight: { min: 25, max: 36, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
  },
  2018: {
    sprint_30m: { min: 5.3, max: 5.8, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    sprint_30m_second: { min: 5.4, max: 5.9, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    agility: { min: 20.5, max: 22.0, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    vertical_jump: { min: 18, max: 26, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    flexibility: { min: 0, max: 11, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    pass_count: {
      min: 8,
      max: 16,
      average: 12,
      thresholds: { low: 8, mid: 12, good: 16 },
      direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    },
    height: { min: 126, max: 132, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    weight: { min: 23, max: 34, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
  },
  2019: {
    sprint_30m: { min: 5.5, max: 6.2, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    sprint_30m_second: { min: 5.6, max: 6.3, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    agility: { min: 21.0, max: 23.0, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    vertical_jump: { min: 15, max: 22, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    flexibility: { min: 0, max: 10, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    pass_count: {
      min: 6,
      max: 14,
      average: 10,
      thresholds: { low: 6, mid: 10, good: 14 },
      direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    },
    height: { min: 102, max: 110, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    weight: { min: 16, max: 22, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
  },
  2020: {
    sprint_30m: { min: 5.7, max: 6.4, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    sprint_30m_second: { min: 5.8, max: 6.5, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    agility: { min: 21.5, max: 23.5, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    vertical_jump: { min: 12, max: 18, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    flexibility: { min: 0, max: 10, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    pass_count: {
      min: 6,
      max: 14,
      average: 10,
      thresholds: { low: 6, mid: 10, good: 14 },
      direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    },
    height: { min: 98, max: 106, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    weight: { min: 14, max: 20, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
  },
  2021: {
    sprint_30m: { min: 5.9, max: 6.6, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    sprint_30m_second: { min: 6.0, max: 6.7, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    agility: { min: 22.0, max: 24.0, direction: METRIC_DIRECTIONS.LOWER_IS_BETTER },
    vertical_jump: { min: 10, max: 16, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    flexibility: { min: 0, max: 9, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    pass_count: {
      min: 5,
      max: 12,
      average: 8,
      thresholds: { low: 5, mid: 8, good: 12 },
      direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    },
    height: { min: 94, max: 102, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
    weight: { min: 13, max: 19, direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER },
  },
};

const volleyballGirlsByBirthYear = Object.fromEntries(
  Object.entries(footballByBirthYear).map(([birthYear, metrics]) => [
    Number(birthYear),
    {
      ...metrics,
      sprint_30m: metrics.sprint_30m
        ? {
            ...metrics.sprint_30m,
            min: Number((metrics.sprint_30m.min + 0.25).toFixed(2)),
            max: Number((metrics.sprint_30m.max + 0.35).toFixed(2)),
          }
        : undefined,
      sprint_30m_second: metrics.sprint_30m_second
        ? {
            ...metrics.sprint_30m_second,
            min: Number((metrics.sprint_30m_second.min + 0.25).toFixed(2)),
            max: Number((metrics.sprint_30m_second.max + 0.35).toFixed(2)),
          }
        : undefined,
      agility: metrics.agility
        ? {
            ...metrics.agility,
            min: Number((metrics.agility.min + 0.2).toFixed(2)),
            max: Number((metrics.agility.max + 0.4).toFixed(2)),
          }
        : undefined,
      vertical_jump: metrics.vertical_jump
        ? {
            ...metrics.vertical_jump,
            min: Math.max(5, metrics.vertical_jump.min - 2),
            max: Math.max(8, metrics.vertical_jump.max - 2),
          }
        : undefined,
      pass_count: undefined,
    },
  ]),
) as Record<number, FallbackBenchmarkMetrics>;

function normalizeSportType(sportType?: string | null): FallbackSport {
  return sportType?.toLocaleLowerCase("tr").includes("voley")
    ? "volleyball_girls"
    : "football";
}

export function getFallbackBenchmarks(input: {
  birthYear: number;
  gender?: AthleteGender;
  sportType?: string | null;
}): FallbackBenchmarkMetrics {
  const sport = normalizeSportType(input.sportType);
  if (sport === "volleyball_girls" || input.gender === "female") {
    return volleyballGirlsByBirthYear[input.birthYear] || {};
  }
  return footballByBirthYear[input.birthYear] || {};
}

export function getFallbackBenchmarkRange(input: {
  birthYear: number;
  gender?: AthleteGender;
  sportType?: string | null;
  metricKey: string;
}): FallbackBenchmarkRange | null {
  const benchmarks = getFallbackBenchmarks(input);
  return benchmarks[input.metricKey] || null;
}

export function getFallbackAverage(input: {
  birthYear: number;
  gender?: AthleteGender;
  sportType?: string | null;
  metricKey: string;
}): number | null {
  const range = getFallbackBenchmarkRange(input);
  if (!range) return null;
  if (range.average !== undefined) return range.average;
  return Number(((range.min + range.max) / 2).toFixed(2));
}

function interpolateScore(
  value: number,
  fromValue: number,
  toValue: number,
  fromScore: number,
  toScore: number,
): number {
  if (fromValue === toValue) return toScore;
  const ratio = (value - fromValue) / (toValue - fromValue);
  return fromScore + ratio * (toScore - fromScore);
}

export function calculateFallbackScore(input: {
  birthYear: number;
  gender?: AthleteGender;
  sportType?: string | null;
  metricKey: string;
  value: number | null;
}): number | null {
  const range = getFallbackBenchmarkRange(input);
  if (!range || input.value === null || !Number.isFinite(input.value)) {
    return null;
  }

  if (range.thresholds) {
    const { low, mid, good } = range.thresholds;
    const value = input.value;
    let score: number;

    if (value <= low) {
      score = interpolateScore(Math.max(0, value), 0, low, 0, 25);
    } else if (value <= mid) {
      score = interpolateScore(value, low, mid, 25, 50);
    } else if (value <= good) {
      score = interpolateScore(value, mid, good, 50, 85);
    } else {
      score = interpolateScore(
        Math.min(value, good + (good - mid)),
        good,
        good + (good - mid),
        85,
        100,
      );
    }

    return Number(Math.max(0, Math.min(100, score)).toFixed(1));
  }

  const span = range.max - range.min;
  if (span <= 0) return null;

  const rawRatio =
    range.direction === METRIC_DIRECTIONS.LOWER_IS_BETTER
      ? (range.max - input.value) / span
      : (input.value - range.min) / span;
  const ratio = Math.max(0, Math.min(1, rawRatio));
  return Number((15 + ratio * 70).toFixed(1));
}
