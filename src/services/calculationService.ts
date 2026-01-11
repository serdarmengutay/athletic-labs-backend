/**
 * Performance Calculation Service
 * MVP implementation for athlete performance report generation
 */

import { HistoricalAthleteData, Measurement } from "../models";

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
  bodyFatPercent = 15
): number {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return 0;
  const heightM = heightCm / 100;
  const leanMass = weightKg * (1 - bodyFatPercent / 100);
  return Number((leanMass / (heightM * heightM)).toFixed(2));
}

export function calculateFatigueIndex(
  sprint1: number,
  sprint2: number
): number {
  if (!sprint1 || !sprint2 || sprint1 <= 0) return 0;
  return Number((((sprint2 - sprint1) / sprint1) * 100).toFixed(2));
}

export function calculatePercentile(
  value: number | null,
  referenceValues: (number | null)[],
  lowerIsBetter = false
): number | null {
  // Guard: null/undefined/NaN value
  if (value === null || value === undefined || isNaN(value)) return null;

  const validValues = referenceValues.filter(
    (v): v is number => v !== null && v !== undefined && !isNaN(v)
  );

  // Guard: no valid reference values - return median
  if (validValues.length === 0) return 50;

  const countBelow = lowerIsBetter
    ? validValues.filter((v) => v > value).length
    : validValues.filter((v) => v < value).length;

  // Guard: prevent division by zero (already checked above, but explicit)
  const percentile = Math.round((countBelow / validValues.length) * 100);

  // Guard: ensure valid percentile range and not NaN
  if (isNaN(percentile)) return 50;
  return Math.max(1, Math.min(100, percentile));
}

export async function getReferenceDataByBirthYear(
  birthYear: number
): Promise<HistoricalAthleteData[]> {
  return HistoricalAthleteData.findAll({ where: { birth_year: birthYear } });
}

export function calculateDerivedMetrics(measurement: Measurement) {
  const height = Number(measurement.height) || 0;
  const weight = Number(measurement.weight) || 0;
  const sprint1 = Number(measurement.sprint_30m) || 0;
  const sprint2 = Number(measurement.sprint_30m_second) || 0;
  return {
    bmi: calculateBMI(height, weight),
    ffmi: calculateFFMI(height, weight),
    fatigueIndex: calculateFatigueIndex(sprint1, sprint2),
  };
}

export function calculateAllPercentiles(
  measurement: any,
  referenceData: HistoricalAthleteData[]
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
    "ffmi",
    "fatigue_index",
  ];

  for (const metric of metrics) {
    const config = METRIC_CONFIG[metric];
    if (!config) continue;
    const athleteValue = Number(measurement[metric]) || null;
    const referenceValues = referenceData.map((ref: any) =>
      ref[metric] !== null ? Number(ref[metric]) : null
    );

    percentiles[metric] = calculatePercentile(
      athleteValue,
      referenceValues,
      config.lowerIsBetter
    );
  }
  return percentiles;
}

export function calculateOverallPerformance(
  percentiles: Record<string, number | null>
): number {
  const validPercentiles = Object.values(percentiles).filter(
    (p): p is number => p !== null
  );
  if (validPercentiles.length === 0) return 50;
  return Math.round(
    validPercentiles.reduce((acc, p) => acc + p, 0) / validPercentiles.length
  );
}

export function calculateFourMonthTargets(
  percentiles: Record<string, number | null>
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
  measurement: Measurement
): Promise<AthleteReport> {
  const athlete = athleteTest.athlete;
  const referenceData = await getReferenceDataByBirthYear(athlete.birth_year);

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
    bmi: derived.bmi,
    ffmi: derived.ffmi,
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
      bmi: derived.bmi,
      ffmi: derived.ffmi,
      fatigueIndex: derived.fatigueIndex,
    },
    percentiles,
    fourMonthTargets,
    overallPerformance,
    referenceCount: referenceData.length,
  };
}
