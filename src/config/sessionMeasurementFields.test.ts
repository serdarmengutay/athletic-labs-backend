import assert from "node:assert/strict";
import test from "node:test";
import { getEnabledMeasurementFields } from "./sessionMeasurementFields";

test("keeps all football fields enabled for legacy sessions", () => {
  assert.deepEqual(getEnabledMeasurementFields("Futbol", {}, false), [
    "height",
    "weight",
    "flexibility",
    "sprint30m",
    "sprint30mSecond",
    "agility",
    "verticalJump",
    "passCount",
    "handgrip",
  ]);
});

test("uses volleyball defaults without pass for legacy sessions", () => {
  assert.equal(
    getEnabledMeasurementFields("Kız Voleybol", {}, false).includes("passCount"),
    false,
  );
});

test("honors explicit session fields without deleting stored measurements", () => {
  assert.deepEqual(
    getEnabledMeasurementFields(
      "Futbol",
      { enabledMeasurementFields: ["height", "weight", "agility"] },
      false,
    ),
    ["height", "weight", "agility"],
  );
});

test("removes the VALD-managed vertical jump field", () => {
  assert.equal(
    getEnabledMeasurementFields(
      "Futbol",
      { enabledMeasurementFields: ["verticalJump", "passCount"] },
      true,
    ).includes("verticalJump"),
    false,
  );
});
