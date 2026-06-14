export interface NormalizedSprintMeasurements {
  sprint30m: number | null;
  sprint30mSecond: number | null;
}

const toValidSprint = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

export function normalizeSprintMeasurements(
  first: unknown,
  second: unknown,
): NormalizedSprintMeasurements {
  const sprint30m = toValidSprint(first);
  const sprint30mSecond = toValidSprint(second);

  if (
    sprint30m === null ||
    sprint30mSecond === null ||
    sprint30m <= sprint30mSecond
  ) {
    return { sprint30m, sprint30mSecond };
  }

  return {
    sprint30m: sprint30mSecond,
    sprint30mSecond: sprint30m,
  };
}
