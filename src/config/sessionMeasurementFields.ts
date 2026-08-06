export const MEASUREMENT_KEYS = [
  "height",
  "weight",
  "flexibility",
  "sprint30m",
  "sprint30mSecond",
  "agility",
  "verticalJump",
  "passCount",
  "handgrip",
] as const;

export type MeasurementKey = (typeof MEASUREMENT_KEYS)[number];

const VOLLEYBALL_FIELDS = MEASUREMENT_KEYS.filter((key) => key !== "passCount");

// Eski oturumlarda açık alan listesi olmadığı için branş varsayılanı kullanılır.
export function getEnabledMeasurementFields(
  sportType: string | null | undefined,
  configValue: unknown,
  valdEnabled = false,
): MeasurementKey[] {
  const normalizedSport = String(sportType || "").toLocaleLowerCase("tr");
  const sportFields = normalizedSport.includes("voley")
    ? VOLLEYBALL_FIELDS
    : MEASUREMENT_KEYS;
  const config =
    configValue && typeof configValue === "object" && !Array.isArray(configValue)
      ? (configValue as Record<string, unknown>)
      : {};
  const configuredFields = Array.isArray(config.enabledMeasurementFields)
    ? config.enabledMeasurementFields.filter(
        (key): key is MeasurementKey =>
          typeof key === "string" &&
          MEASUREMENT_KEYS.includes(key as MeasurementKey),
      )
    : null;
  const enabledSet = new Set<MeasurementKey>(configuredFields || sportFields);

  if (valdEnabled) {
    enabledSet.delete("verticalJump");
  }

  return sportFields.filter((key) => enabledSet.has(key));
}

export const MEASUREMENT_DATABASE_FIELDS: Record<MeasurementKey, string> = {
  height: "height",
  weight: "weight",
  flexibility: "flexibility",
  sprint30m: "sprint_30m",
  sprint30mSecond: "sprint_30m_second",
  agility: "agility",
  verticalJump: "vertical_jump",
  passCount: "pass_count",
  handgrip: "handgrip",
};
