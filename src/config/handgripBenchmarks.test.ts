import test from "node:test";
import assert from "node:assert/strict";
import { classifyMaleFootballHandgrip } from "./handgripBenchmarks";

test("classifies handgrip against the athlete birth year", () => {
  assert.equal(classifyMaleFootballHandgrip(2015, 24.9), "Ortalama");
  assert.equal(classifyMaleFootballHandgrip(2015, 25), "İyi");
  assert.equal(classifyMaleFootballHandgrip(2015, 30), "Çok İyi");
});

test("returns null when a benchmark or measurement is unavailable", () => {
  assert.equal(classifyMaleFootballHandgrip(2010, 30), null);
  assert.equal(classifyMaleFootballHandgrip(2015, null), null);
});
