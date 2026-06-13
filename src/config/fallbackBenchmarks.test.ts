import assert from "node:assert/strict";
import test from "node:test";
import { calculateFallbackScore } from "./fallbackBenchmarks";

test("2013 football passing benchmark does not collapse 8 passes to zero", () => {
  const score = calculateFallbackScore({
    birthYear: 2013,
    gender: "male",
    sportType: "Futbol",
    metricKey: "pass_count",
    value: 8,
  });

  assert.equal(score, 16.7);
});

test("passing benchmark rewards results above the age-group good threshold", () => {
  const score = calculateFallbackScore({
    birthYear: 2016,
    gender: "male",
    sportType: "Futbol",
    metricKey: "pass_count",
    value: 20,
  });

  assert.equal(score, 85);
});
