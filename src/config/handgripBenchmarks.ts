import { AthleteGender } from "./gender";

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

export const FEMALE_VOLLEYBALL_HANDGRIP_BENCHMARKS: Record<
  number,
  HandgripThresholds
> = {
  2011: { goodMin: 29, veryGoodMin: 34 },
  2012: { goodMin: 27, veryGoodMin: 32 },
  2013: { goodMin: 25, veryGoodMin: 30 },
  2014: { goodMin: 23, veryGoodMin: 28 },
  2015: { goodMin: 21, veryGoodMin: 25 },
  2016: { goodMin: 19, veryGoodMin: 23 },
  2017: { goodMin: 17, veryGoodMin: 21 },
  2018: { goodMin: 15, veryGoodMin: 19 },
  2019: { goodMin: 13, veryGoodMin: 17 },
  2020: { goodMin: 12, veryGoodMin: 15 },
  2021: { goodMin: 10, veryGoodMin: 13 },
};

export function classifyHandgrip(
  birthYear: number,
  gender: AthleteGender,
  value: number | null | undefined,
): HandgripCategory | null {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return null;
  }

  const thresholds =
    gender === "female"
      ? FEMALE_VOLLEYBALL_HANDGRIP_BENCHMARKS[birthYear]
      : MALE_FOOTBALL_HANDGRIP_BENCHMARKS[birthYear];
  if (!thresholds) return null;

  if (Number(value) >= thresholds.veryGoodMin) return "Çok İyi";
  if (Number(value) >= thresholds.goodMin) return "İyi";
  return "Ortalama";
}
