import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCashForecast,
  calculateCashForecastOpeningBalance,
  calculateDailyCashForecast,
  resolveBalanceLevel,
  resolvePendingCashDate,
} from "./cash-forecast";
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

const dailyBase = {
  today: "2026-11-14",
  openingBalance: 1_000,
  minimumBalance: 400,
  realizedPostings: [],
  scheduledEvents: [],
  budgets: [],
  simulations: [],
};

test("daily balances carry realized days, today and pending events in order", () => {
  const forecast = calculateDailyCashForecast({
    ...dailyBase,
    period: "2026-11",
    realizedPostings: [
      { date: "2026-11-05", amount: 3_000 },
      { date: "2026-11-10", amount: -2_200 },
    ],
    scheduledEvents: [
      { date: "2026-11-03", amount: -120, kind: "expense", label: "Internet atrasada" },
      { date: "2026-11-20", amount: -500, kind: "invoice", label: "Fatura Nubank" },
    ],
  });
  const byDate = new Map(forecast.days.map((day) => [day.date, day]));
  assert.equal(forecast.days.length, 30);
  assert.equal(forecast.openingBalance, 1_000);
  assert.equal(byDate.get("2026-11-04")?.closingBalance, 1_000);
  assert.equal(byDate.get("2026-11-05")?.status, "past");
  assert.equal(byDate.get("2026-11-05")?.dailyAmount, null);
  assert.equal(byDate.get("2026-11-10")?.closingBalance, 1_800);
  assert.equal(byDate.get("2026-11-14")?.status, "today");
  assert.equal(byDate.get("2026-11-14")?.closingBalance, 1_680);
  assert.equal(byDate.get("2026-11-14")?.events[0]?.label, "Internet atrasada");
  assert.equal(byDate.get("2026-11-20")?.closingBalance, 1_180);
  assert.equal(byDate.get("2026-11-30")?.closingBalance, 1_180);
});

test("daily spending uses today's allowance and spreads the rest of the reserve to the cent", () => {
  const forecast = calculateDailyCashForecast({
    ...dailyBase,
    period: "2026-11",
    budgets: [{ period: "2026-11", reserveAmount: 340, todayAmount: 10, estimated: false }],
  });
  const future = forecast.days.filter((day) => day.status !== "past");
  assert.equal(future[0]?.dailyAmount, 10);
  assert.equal(future[1]?.dailyAmount, 20.62);
  assert.equal(future.at(-1)?.dailyAmount, 20.7);
  assert.equal(
    future.reduce((total, day) => total + Math.round((day.dailyAmount ?? 0) * 100), 0),
    34_000,
  );
  assert.equal(forecast.days.at(-1)?.closingBalance, 660);
});

test("later months chain from the current month and place simulations on their first day", () => {
  const forecast = calculateDailyCashForecast({
    ...dailyBase,
    period: "2026-12",
    scheduledEvents: [{ date: "2026-11-20", amount: -300, kind: "expense", label: "Aluguel" }],
    budgets: [{ period: "2026-12", reserveAmount: 310, estimated: true }],
    simulations: [{ amount: 900, installmentCount: 3, firstPeriod: "2026-12", label: "Notebook" }],
  });
  assert.equal(forecast.openingBalance, 700);
  assert.equal(forecast.budgetEstimated, true);
  assert.equal(forecast.days[0]?.simulationAmount, 300);
  assert.equal(forecast.days[0]?.dailyAmount, 10);
  assert.equal(forecast.days[0]?.closingBalance, 390);
  assert.equal(forecast.days[0]?.level, "attention");
  assert.equal(forecast.days.at(-1)?.closingBalance, 90);
  assert.equal(forecast.days.at(-1)?.level, "warning");
  assert.deepEqual(forecast.lowestBalance, { date: "2026-12-31", amount: 90 });
});

test("balance levels follow the minimum balance and a zero minimum only flags negatives", () => {
  assert.equal(resolveBalanceLevel(-0.01, 400), "critical");
  assert.equal(resolveBalanceLevel(199.99, 400), "warning");
  assert.equal(resolveBalanceLevel(399.99, 400), "attention");
  assert.equal(resolveBalanceLevel(400, 400), "healthy");
  assert.equal(resolveBalanceLevel(0, 0), "healthy");
});

test("pending cash dates prefer the scheduled payment, then the due date, and late items land today", () => {
  const today = "2026-11-14";
  assert.equal(
    resolvePendingCashDate({
      purchaseDate: "2026-11-01",
      dueDate: "2026-11-25",
      boletoPaymentDate: "2026-11-20",
      today,
    }),
    "2026-11-20",
  );
  assert.equal(
    resolvePendingCashDate({ purchaseDate: "2026-11-01", dueDate: "2026-11-25", today }),
    "2026-11-25",
  );
  assert.equal(resolvePendingCashDate({ purchaseDate: "2026-11-02", today }), today);
});
