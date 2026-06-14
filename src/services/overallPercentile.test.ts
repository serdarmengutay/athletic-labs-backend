import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateWeightedTopPercentile,
  scoreToTopPercentile,
} from "./calculationService";

test("uses top-percentile semantics where lower is better", () => {
  assert.equal(
    calculateWeightedTopPercentile([
      { percentile: 20 },
      { percentile: 20 },
      { percentile: 20 },
    ]),
    20,
  );
});

test("calculates the weighted average independently from radar scores", () => {
  assert.equal(
    calculateWeightedTopPercentile([
      { percentile: 10, weight: 1 },
      { percentile: 20, weight: 1 },
      { percentile: 30, weight: 2 },
    ]),
    22.5,
  );
});

test("ignores missing metrics without changing remaining weights", () => {
  assert.equal(
    calculateWeightedTopPercentile([
      { percentile: null },
      { percentile: 15 },
      { percentile: undefined },
      { percentile: 25 },
    ]),
    20,
  );
});

test("converts benchmark success scores to the same top-percentile scale", () => {
  assert.equal(scoreToTopPercentile(80), 20);
  assert.equal(scoreToTopPercentile(100), 0);
  assert.equal(scoreToTopPercentile(50), 50);
});
