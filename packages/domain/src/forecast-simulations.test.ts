import assert from "node:assert/strict";
import test from "node:test";
import {
  createForecastSimulationDraft,
  expandForecastSimulation,
  getForecastSimulationEndPeriod,
} from "./forecast-simulations";

test("simulations split cents like a real installment series across consecutive months", () => {
  const simulation = { amount: "100.00", installmentCount: 3, firstPeriod: "2026-11" };
  assert.deepEqual(expandForecastSimulation(simulation), [
    { period: "2026-11", amount: 33.34 },
    { period: "2026-12", amount: 33.33 },
    { period: "2027-01", amount: 33.33 },
  ]);
  assert.equal(getForecastSimulationEndPeriod(simulation), "2027-01");
});

test("single purchases land entirely on the first month", () => {
  assert.deepEqual(
    expandForecastSimulation({ amount: 450.5, installmentCount: 1, firstPeriod: "2027-02" }),
    [{ period: "2027-02", amount: 450.5 }],
  );
});

test("simulation drafts trim the description, keep cents and start active", () => {
  assert.deepEqual(
    createForecastSimulationDraft({
      userId: "owner",
      description: "  Fone novo ",
      amount: 899.9,
      installmentCount: 10,
      firstPeriod: "2026-12",
    }),
    {
      userId: "owner",
      description: "Fone novo",
      amount: "899.90",
      installmentCount: 10,
      firstPeriod: "2026-12",
      isActive: true,
    },
  );
});
