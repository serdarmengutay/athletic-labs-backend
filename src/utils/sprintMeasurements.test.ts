import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSprintMeasurements } from "./sprintMeasurements";

test("keeps sprint attempts when the second run is slower", () => {
  assert.deepEqual(normalizeSprintMeasurements(5.02, 5.07), {
    sprint30m: 5.02,
    sprint30mSecond: 5.07,
  });
});

test("swaps sprint attempts when the second run is faster", () => {
  assert.deepEqual(normalizeSprintMeasurements(5.07, 5.02), {
    sprint30m: 5.02,
    sprint30mSecond: 5.07,
  });
});

test("preserves an incomplete sprint pair", () => {
  assert.deepEqual(normalizeSprintMeasurements(5.07, null), {
    sprint30m: 5.07,
    sprint30mSecond: null,
  });
});
