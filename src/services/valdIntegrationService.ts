export interface ValdMetricMapping {
  key: string;
  label: string;
  unit?: string;
  sourcePath?: string;
  reportSection?: string;
  manualField?: string;
}

export interface ValdSessionConfig {
  schemaVersion: number;
  disabledManualFields: string[];
  expectedMetrics: ValdMetricMapping[];
}

export interface NormalizedValdPayload {
  metrics: Record<string, number | string | null>;
  missingMetricKeys: string[];
}

function readPath(payload: Record<string, any>, path?: string): unknown {
  if (!path) return undefined;
  return path
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((current, segment) => {
      if (!current || typeof current !== "object") return undefined;
      return (current as Record<string, unknown>)[segment];
    }, payload);
}

function normalizeMetricValue(value: unknown): number | string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed.replace(",", "."));
    return Number.isFinite(numeric) ? numeric : trimmed;
  }
  return null;
}

export function normalizeValdPayload(
  rawPayload: Record<string, any>,
  config: ValdSessionConfig,
): NormalizedValdPayload {
  const metrics: Record<string, number | string | null> = {};
  const missingMetricKeys: string[] = [];

  for (const mapping of config.expectedMetrics) {
    const value = normalizeMetricValue(readPath(rawPayload, mapping.sourcePath));
    metrics[mapping.key] = value;
    if (value === null) {
      missingMetricKeys.push(mapping.key);
    }
  }

  return {
    metrics,
    missingMetricKeys,
  };
}
