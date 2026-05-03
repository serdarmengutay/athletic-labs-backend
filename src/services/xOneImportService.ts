import { calculateBMI, calculateFatigueIndex } from "./calculationService";

export interface NormalizedXOneSections {
  composition: Record<string, any> | null;
  measurement: Record<string, any> | null;
  posture: Record<string, any> | null;
  balance: Record<string, any> | null;
}

export interface NormalizedXOneMetrics {
  height: number | null;
  weight: number | null;
  flexibility: number | null;
  sprint30m: number | null;
  sprint30mSecond: number | null;
  agility: number | null;
  verticalJump: number | null;
  passCount: number | null;
  bmi: number | null;
  ffmi: number | null;
  fatigueIndex: number | null;
}

interface NormalizedXOnePayload {
  sections: NormalizedXOneSections;
  metrics: NormalizedXOneMetrics;
}

function calculateFfmiFromBodyFat(
  heightCm: number | null,
  weightKg: number | null,
  bodyFatPercent: number | null,
): number | null {
  if (
    !heightCm ||
    !weightKg ||
    heightCm <= 0 ||
    weightKg <= 0 ||
    bodyFatPercent === null ||
    bodyFatPercent < 0 ||
    bodyFatPercent >= 100
  ) {
    return null;
  }

  const heightM = heightCm / 100;
  const leanMass = weightKg * (1 - bodyFatPercent / 100);
  return Number((leanMass / (heightM * heightM)).toFixed(2));
}

const SECTION_ALIASES: Record<keyof NormalizedXOneSections, string[]> = {
  composition: ["composition", "bodyComposition", "body_composition"],
  measurement: ["measurement", "measurements", "metrics", "result", "results"],
  posture: ["posture", "postures"],
  balance: ["balance", "balances"],
};

const METRIC_CANDIDATES: Record<keyof Omit<NormalizedXOneMetrics, "bmi" | "ffmi" | "fatigueIndex">, string[]> =
  {
    height: ["height", "bodyHeight", "body_height", "stature"],
    weight: ["weight", "bodyWeight", "body_weight", "mass"],
    flexibility: ["flexibility", "sitAndReach", "sit_and_reach", "sitreach"],
    sprint30m: ["sprint30m", "sprint_30m", "run30m", "thirtyMeter", "30mSprint", "sprint30"],
    sprint30mSecond: [
      "sprint30mSecond",
      "sprint_30m_second",
      "run30mSecond",
      "second30m",
      "30mSecond",
      "sprintSecond30",
    ],
    agility: ["agility", "agilityRun", "tAgility", "t_agility", "illinois", "agility505"],
    verticalJump: ["verticalJump", "vertical_jump", "jump", "cmj", "counterMovementJump"],
    passCount: ["passCount", "pass_count", "passes", "pass"],
  };

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function collectCandidates(source: unknown, bucket: Map<string, unknown>) {
  if (Array.isArray(source)) {
    for (const item of source) {
      collectCandidates(item, bucket);
    }
    return;
  }

  if (!isPlainObject(source)) {
    return;
  }

  for (const [key, value] of Object.entries(source)) {
    const normalized = normalizeKey(key);
    if (!bucket.has(normalized)) {
      bucket.set(normalized, value);
    }
    collectCandidates(value, bucket);
  }
}

function findSection(
  rawPayload: Record<string, any>,
  aliases: string[],
): Record<string, any> | null {
  for (const alias of aliases) {
    const directValue = rawPayload[alias];
    if (isPlainObject(directValue)) {
      return directValue;
    }
  }

  const queue: unknown[] = [rawPayload];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!isPlainObject(current)) continue;

    for (const [key, value] of Object.entries(current)) {
      if (aliases.includes(key) && isPlainObject(value)) {
        return value;
      }
      if (isPlainObject(value) || Array.isArray(value)) {
        queue.push(value);
      }
    }
  }

  return null;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value) : null;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getFirstNumericValue(
  sections: Array<Record<string, any> | null>,
  candidates: string[],
): number | null {
  const normalizedCandidates = candidates.map(normalizeKey);

  for (const section of sections) {
    if (!section) continue;
    const bucket = new Map<string, unknown>();
    collectCandidates(section, bucket);

    for (const candidate of normalizedCandidates) {
      if (!bucket.has(candidate)) continue;
      const numericValue = toNumberOrNull(bucket.get(candidate));
      if (numericValue !== null) {
        return numericValue;
      }
    }
  }

  return null;
}

export function normalizeXOnePayload(
  rawPayload: Record<string, any>,
): NormalizedXOnePayload {
  const payloadData = isPlainObject(rawPayload.data) ? rawPayload.data : rawPayload;

  const sections: NormalizedXOneSections = {
    composition: findSection(payloadData, SECTION_ALIASES.composition),
    measurement: findSection(payloadData, SECTION_ALIASES.measurement),
    posture: findSection(payloadData, SECTION_ALIASES.posture),
    balance: findSection(payloadData, SECTION_ALIASES.balance),
  };

  const searchSections = [
    sections.measurement,
    sections.composition,
    sections.posture,
    sections.balance,
    payloadData,
    rawPayload,
  ];

  const measurementSection = sections.measurement;
  const compositionSection = sections.composition;
  const postureSection = sections.posture;
  const balanceSection = sections.balance;

  const height =
    toNumberOrNull(measurementSection?.height) ??
    getFirstNumericValue(searchSections, METRIC_CANDIDATES.height);
  const weight =
    toNumberOrNull(measurementSection?.weight) ??
    toNumberOrNull(compositionSection?.weight?.value) ??
    getFirstNumericValue(searchSections, METRIC_CANDIDATES.weight);
  const bmiSource =
    toNumberOrNull(measurementSection?.outline?.bmi) ??
    toNumberOrNull(compositionSection?.bmi?.value) ??
    getFirstNumericValue(searchSections, ["bmi", "bodyMassIndex"]);
  const bodyFatPercent =
    toNumberOrNull(measurementSection?.outline?.pbf) ??
    toNumberOrNull(compositionSection?.pbf?.value) ??
    getFirstNumericValue(searchSections, ["pbf", "bodyFatPercent"]);

  const baseMetrics = {
    height,
    weight,
    flexibility: getFirstNumericValue(searchSections, METRIC_CANDIDATES.flexibility),
    sprint30m: getFirstNumericValue(searchSections, METRIC_CANDIDATES.sprint30m),
    sprint30mSecond: getFirstNumericValue(
      searchSections,
      METRIC_CANDIDATES.sprint30mSecond,
    ),
    agility: getFirstNumericValue(searchSections, METRIC_CANDIDATES.agility),
    verticalJump: getFirstNumericValue(
      searchSections,
      METRIC_CANDIDATES.verticalJump,
    ),
    passCount: getFirstNumericValue(searchSections, METRIC_CANDIDATES.passCount),
  };

  const ffmiSource =
    getFirstNumericValue(searchSections, ["ffmi"]) ??
    calculateFfmiFromBodyFat(height, weight, bodyFatPercent);
  const fatigueSource = getFirstNumericValue(searchSections, [
    "fatigueIndex",
    "fatigue_index",
  ]);

  const derivedBmi =
    height && weight
      ? calculateBMI(height, weight)
      : null;
  const derivedFatigue =
    baseMetrics.sprint30m && baseMetrics.sprint30mSecond
      ? calculateFatigueIndex(baseMetrics.sprint30m, baseMetrics.sprint30mSecond)
      : null;

  return {
    sections,
    metrics: {
      ...baseMetrics,
      bmi: bmiSource ?? derivedBmi,
      ffmi: ffmiSource,
      fatigueIndex: fatigueSource ?? derivedFatigue,
    },
  };
}
