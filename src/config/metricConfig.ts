export const METRIC_DIRECTIONS = {
  LOWER_IS_BETTER: "lower_is_better",
  HIGHER_IS_BETTER: "higher_is_better",
} as const;

export type MetricDirection =
  (typeof METRIC_DIRECTIONS)[keyof typeof METRIC_DIRECTIONS];

export const TIE_STRATEGIES = {
  STRICT: "strict",
  MIDPOINT: "midpoint",
} as const;

export type TieStrategy =
  (typeof TIE_STRATEGIES)[keyof typeof TIE_STRATEGIES];

export interface MetricValueRange {
  min?: number;
  max?: number;
}

export interface MetricConfigEntry {
  label: string;
  unit: string;
  direction: MetricDirection;
  weight: number;
  minSampleSize: number;
  tieStrategy: TieStrategy;
  scorePrecision: number;
  percentilePrecision: number;
  validRange?: MetricValueRange;
}

export type MetricConfigMap = Record<string, MetricConfigEntry>;

export const DEFAULT_COMPARISON_THRESHOLDS = {
  minSampleSize: 50,
  scorePrecision: 1,
  percentilePrecision: 1,
  weight: 1,
  tieStrategy: TIE_STRATEGIES.MIDPOINT as TieStrategy,
} as const;

const baseMetricConfig = {
  weight: DEFAULT_COMPARISON_THRESHOLDS.weight,
  minSampleSize: DEFAULT_COMPARISON_THRESHOLDS.minSampleSize,
  tieStrategy: DEFAULT_COMPARISON_THRESHOLDS.tieStrategy,
  scorePrecision: DEFAULT_COMPARISON_THRESHOLDS.scorePrecision,
  percentilePrecision: DEFAULT_COMPARISON_THRESHOLDS.percentilePrecision,
};

export const METRIC_CONFIG: MetricConfigMap = {
  height: {
    ...baseMetricConfig,
    label: "Boy",
    unit: "cm",
    direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    validRange: { min: 70, max: 230 },
  },
  weight: {
    ...baseMetricConfig,
    label: "Kilo",
    unit: "kg",
    direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    validRange: { min: 10, max: 200 },
  },
  sprint_30m: {
    ...baseMetricConfig,
    label: "30m Sprint",
    unit: "second",
    direction: METRIC_DIRECTIONS.LOWER_IS_BETTER,
    validRange: { min: 2, max: 15 },
  },
  sprint_30m_second: {
    ...baseMetricConfig,
    label: "İkinci 30m Sprint",
    unit: "second",
    direction: METRIC_DIRECTIONS.LOWER_IS_BETTER,
    validRange: { min: 2, max: 15 },
  },
  agility: {
    ...baseMetricConfig,
    label: "Çeviklik",
    unit: "second",
    direction: METRIC_DIRECTIONS.LOWER_IS_BETTER,
    validRange: { min: 4, max: 40 },
  },
  vertical_jump: {
    ...baseMetricConfig,
    label: "Dikey Sıçrama",
    unit: "cm",
    direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    validRange: { min: 5, max: 120 },
  },
  flexibility: {
    ...baseMetricConfig,
    label: "Esneklik",
    unit: "cm",
    direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    validRange: { min: -30, max: 60 },
  },
  pass_count: {
    ...baseMetricConfig,
    label: "Pas",
    unit: "count",
    direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    validRange: { min: 0, max: 60 },
  },
  bmi: {
    ...baseMetricConfig,
    label: "VKI",
    unit: "ratio",
    direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    validRange: { min: 8, max: 60 },
  },
  ffmi: {
    ...baseMetricConfig,
    label: "FFMI",
    unit: "ratio",
    direction: METRIC_DIRECTIONS.HIGHER_IS_BETTER,
    validRange: { min: 8, max: 40 },
  },
  fatigue_index: {
    ...baseMetricConfig,
    label: "Yorgunluk İndeksi",
    unit: "percent",
    direction: METRIC_DIRECTIONS.LOWER_IS_BETTER,
    validRange: { min: 0, max: 100 },
  },
};
