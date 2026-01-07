// Yorgunluk endeksi hesaplama
export const calculateFatigueIndex = (
  first: number,
  second: number
): number => {
  if (first === 0 || second === 0) return 0;
  return ((second - first) / first) * 100;
};

// Yüzdelik dilim hesaplama
export const calculatePercentile = (
  value: number,
  values: number[],
  reverse: boolean = false
): number => {
  if (values.length === 0) return 0;

  const sortedValues = [...values].sort((a, b) => a - b);
  const index = sortedValues.findIndex((v) =>
    reverse ? v >= value : v <= value
  );

  if (index === -1) return reverse ? 0 : 100;

  return ((index + 1) / sortedValues.length) * 100;
};

// Puan hesaplama (100 - yüzdelik dilim)
export const calculateScore = (percentile: number): number => {
  return Math.max(0, 100 - percentile);
};

// Genel performans puanı hesaplama
export const calculateOverallScore = (scores: number[]): number => {
  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
};

// Yaş grubu belirleme
export const getAgeGroup = (birthYear: number): string => {
  const today = new Date();
  const age = today.getFullYear() - birthYear;

  if (age < 10) return "U10";
  if (age < 12) return "U12";
  if (age < 14) return "U14";
  if (age < 16) return "U16";
  if (age < 18) return "U18";
  if (age < 20) return "U20";
  return "Senior";
};

// Doğum yılı alma (artık direkt yıl geliyor)
export const getBirthYear = (birthYear: number): number => {
  return birthYear;
};

// BMI hesaplama
export const calculateBMI = (height: number, weight: number): number => {
  return weight / Math.pow(height / 100, 2);
};

// FFMI hesaplama (Fat-Free Mass Index)
export const calculateFFMI = (
  height: number,
  weight: number,
  bodyFat: number
): number => {
  const leanBodyMass = weight * (1 - bodyFat / 100);
  return leanBodyMass / Math.pow(height / 100, 2);
};

// Performans kategorisi belirleme
export const getPerformanceCategory = (percentile: number): string => {
  if (percentile >= 90) return "Mükemmel";
  if (percentile >= 75) return "Çok İyi";
  if (percentile >= 50) return "İyi";
  if (percentile >= 25) return "Orta";
  return "Geliştirilmeli";
};

// Test sonucu değerlendirme
export const evaluateTestResult = (
  value: number,
  min: number,
  max: number,
  reverse: boolean = false
): string => {
  const percentage = ((value - min) / (max - min)) * 100;
  const adjustedPercentage = reverse ? 100 - percentage : percentage;

  if (adjustedPercentage >= 90) return "Mükemmel";
  if (adjustedPercentage >= 75) return "Çok İyi";
  if (adjustedPercentage >= 50) return "İyi";
  if (adjustedPercentage >= 25) return "Orta";
  return "Geliştirilmeli";
};

// Sporcu kodu oluşturma (doğum yılı + sıra numarası)
export const generateAthleteCode = (
  birthYear: number,
  existingAthletes: any[]
): string => {
  const sameYearAthletes = existingAthletes.filter(
    (athlete) => athlete.birth_year === birthYear
  );

  const nextSequence = sameYearAthletes.length + 1;
  return `${birthYear}${nextSequence.toString().padStart(6, "0")}`;
};

// Yaş grubuna göre yüzdelik dilim hesaplama
export const calculateAgeGroupPercentile = (
  value: number,
  ageGroup: string,
  metric: string,
  allResults: any[]
): number => {
  const ageGroupResults = allResults.filter(
    (result) => result.ageGroup === ageGroup && result.metric === metric
  );

  if (ageGroupResults.length === 0) return 0;

  const values = ageGroupResults.map((r) => r.value).sort((a, b) => a - b);
  const index = values.findIndex((v) => v <= value);

  if (index === -1) return 100;
  return ((index + 1) / values.length) * 100;
};

// Metrik bazlı skor hesaplama (100 - yüzdelik dilim)
export const calculateMetricScore = (percentile: number): number => {
  return Math.max(0, 100 - percentile);
};
