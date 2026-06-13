export type HandgripCategory = "Ortalama" | "İyi" | "Çok İyi";

interface HandgripThresholds {
  goodMin: number;
  veryGoodMin: number;
}

// Dominant/en iyi el için kg cinsinden erkek futbolcu saha benchmark'ları.
// Ayrı tutulur; saha verisi büyüdükçe migration gerektirmeden güncellenebilir.
export const MALE_FOOTBALL_HANDGRIP_BENCHMARKS: Record<
  number,
  HandgripThresholds
> = {
  2011: { goodMin: 34, veryGoodMin: 40 },
  2012: { goodMin: 32, veryGoodMin: 38 },
  2013: { goodMin: 30, veryGoodMin: 36 },
  2014: { goodMin: 28, veryGoodMin: 34 },
  2015: { goodMin: 25, veryGoodMin: 30 },
  2016: { goodMin: 23, veryGoodMin: 28 },
  2017: { goodMin: 20, veryGoodMin: 24 },
  2018: { goodMin: 18, veryGoodMin: 22 },
  2019: { goodMin: 16, veryGoodMin: 20 },
  2020: { goodMin: 14, veryGoodMin: 18 },
  2021: { goodMin: 12, veryGoodMin: 16 },
};

export function classifyMaleFootballHandgrip(
  birthYear: number,
  value: number | null | undefined,
): HandgripCategory | null {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return null;
  }

  const thresholds = MALE_FOOTBALL_HANDGRIP_BENCHMARKS[birthYear];
  if (!thresholds) return null;

  if (Number(value) >= thresholds.veryGoodMin) return "Çok İyi";
  if (Number(value) >= thresholds.goodMin) return "İyi";
  return "Ortalama";
}
