import assert from "node:assert/strict";
import test from "node:test";
import { calculateCashForecast, calculateCashForecastOpeningBalance } from "./cash-forecast";
import type { CommitmentMonth } from "./commitments";

function month(period: string, incomeAmount: number, committedAmount: number): CommitmentMonth {
  return {
    period,
    installmentsAmount: 0,
    recurringAmount: committedAmount,
    billsAmount: 0,
    creditsAmount: 0,
    committedAmount,
    incomeAmount,
    freeAmount: incomeAmount - committedAmount,
    commitmentPercentage: null,
    status: "healthy",
  };
}

test("forecast carries each closing balance into the next month and reserves unspent budgets", () => {
  const forecast = calculateCashForecast({
    openingBalance: 1_000,
    commitments: [month("2026-11", 3_000, 2_000), month("2026-12", 3_000, 2_500)],
    budgetReserves: [
      { period: "2026-11", amount: 500, estimated: false },
      { period: "2026-12", amount: 800, estimated: true },
    ],
    simulations: [],
  });
  assert.equal(forecast.startPeriod, "2026-11");
  assert.deepEqual(
    forecast.months.map((item) => [
      item.openingBalance,
      item.outflowAmount,
      item.closingBalance,
      item.usagePercentage,
      item.level,
      item.budgetReserveEstimated,
    ]),
    [
      [1_000, 2_500, 1_500, 62.5, "healthy", false],
      [1_500, 3_300, 1_200, 73.3, "attention", true],
    ],
  );
  assert.deepEqual(forecast.lowestBalance, { period: "2026-12", amount: 1_200 });
  assert.equal(forecast.firstNegativePeriod, null);
});

test("active simulations show their impact against the baseline and turn negative months red", () => {
  const forecast = calculateCashForecast({
    openingBalance: 200,
    commitments: [
      month("2026-11", 2_000, 1_800),
      month("2026-12", 2_000, 1_800),
      month("2027-01", 2_000, 1_800),
    ],
    budgetReserves: [],
    simulations: [{ amount: 1_500, installmentCount: 3, firstPeriod: "2026-11" }],
  });
  assert.deepEqual(
    forecast.months.map((item) => [item.simulationAmount, item.closingBalance, item.level]),
    [
      [500, -100, "critical"],
      [500, -400, "critical"],
      [500, -700, "critical"],
    ],
  );
  assert.deepEqual(
    forecast.months.map((item) => item.baselineClosingBalance),
    [400, 600, 800],
  );
  assert.equal(forecast.firstNegativePeriod, "2026-11");
  assert.equal(forecast.simulationsAmount, 1_500);
});

test("a month without money available is critical as soon as anything goes out", () => {
  const forecast = calculateCashForecast({
    openingBalance: 0,
    commitments: [month("2026-11", 0, 0), month("2026-12", 0, 10)],
    budgetReserves: [],
    simulations: [],
  });
  assert.equal(forecast.months[0]?.level, "healthy");
  assert.equal(forecast.months[0]?.usagePercentage, null);
  assert.equal(forecast.months[1]?.level, "critical");
});

test("opening balance only counts active accounts included in the total balance", () => {
  assert.equal(
    calculateCashForecastOpeningBalance([
      { isArchived: false, excludeFromBalance: false, balance: 1_000.1 },
      { isArchived: false, excludeFromBalance: false, balance: -200.05 },
      { isArchived: true, excludeFromBalance: false, balance: 500 },
      { isArchived: false, excludeFromBalance: true, balance: 900 },
    ]),
    800.05,
  );
});

test("a negative opening balance is carried with its sign", () => {
  const forecast = calculateCashForecast({
    openingBalance: -500,
    commitments: [month("2026-11", 1_000, 200)],
    budgetReserves: [],
    simulations: [],
  });
  assert.equal(forecast.months[0]?.closingBalance, 300);
  assert.equal(forecast.months[0]?.usagePercentage, 40);
});
