import test from "node:test";
import assert from "node:assert/strict";
import { classifyHandgrip } from "./handgripBenchmarks";

test("classifies male handgrip against the athlete birth year", () => {
  assert.equal(classifyHandgrip(2015, "male", 24.9), "Ortalama");
  assert.equal(classifyHandgrip(2015, "male", 25), "İyi");
  assert.equal(classifyHandgrip(2015, "male", 30), "Çok İyi");
});

test("uses a separate female handgrip benchmark", () => {
  assert.equal(classifyHandgrip(2015, "female", 20.9), "Ortalama");
  assert.equal(classifyHandgrip(2015, "female", 21), "İyi");
  assert.equal(classifyHandgrip(2015, "female", 25), "Çok İyi");
});

test("returns null when a benchmark or measurement is unavailable", () => {
  assert.equal(classifyHandgrip(2010, "male", 30), null);
  assert.equal(classifyHandgrip(2015, "female", null), null);
});
