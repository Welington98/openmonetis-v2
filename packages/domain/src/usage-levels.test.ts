import assert from "node:assert/strict";
import test from "node:test";
import { resolveUsageLevel } from "./usage-levels";

test("usage levels split green, yellow, orange and red at 70, 90 and 100 percent", () => {
  assert.equal(resolveUsageLevel(0), "healthy");
  assert.equal(resolveUsageLevel(69.9), "healthy");
  assert.equal(resolveUsageLevel(70), "attention");
  assert.equal(resolveUsageLevel(89.9), "attention");
  assert.equal(resolveUsageLevel(90), "warning");
  assert.equal(resolveUsageLevel(100), "warning");
  assert.equal(resolveUsageLevel(100.1), "critical");
});

test("usage without anything available is critical only when something was used", () => {
  assert.equal(resolveUsageLevel(null, 0), "healthy");
  assert.equal(resolveUsageLevel(null, 0.01), "critical");
});
