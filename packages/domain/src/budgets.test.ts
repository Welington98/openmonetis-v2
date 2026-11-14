import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateBudgetOverview,
  calculateBudgetSpending,
  calculateDailyBudgetAllowance,
} from "./budgets";

test("keeps category excess separate from remaining limits", () => {
  const result = calculateBudgetOverview(
    [
      { categoryId: "food", amount: 100 },
      { categoryId: "transport", amount: 300 },
    ],
    {
      actualByCategory: new Map([
        ["food", 150],
        ["transport", 100],
      ]),
      projectedByCategory: new Map([["food", 50]]),
      uncategorizedActualAmount: 0,
      uncategorizedProjectedAmount: 0,
    },
  );
  assert.equal(result.availableAmount, 200);
  assert.equal(result.exceededAmount, 100);
  assert.equal(result.committedAmount, 300);
  assert.equal(result.usagePercentage, 75);
});

test("breaks down unbudgeted expenses including recurrence-only and uncategorized entries", () => {
  const result = calculateBudgetOverview([{ categoryId: "food", amount: 100 }], {
    actualByCategory: new Map([
      ["food", 20],
      ["health", 40],
      ["refunded", -10],
    ]),
    projectedByCategory: new Map([
      ["health", 10],
      ["rent", 200],
    ]),
    uncategorizedActualAmount: 30,
    uncategorizedProjectedAmount: 5,
  });
  assert.deepEqual(result.unbudgetedItems, [
    { categoryId: "rent", committedAmount: 200 },
    { categoryId: "health", committedAmount: 50 },
    { categoryId: null, committedAmount: 35 },
  ]);
  assert.equal(result.unbudgetedCommittedAmount, 285);
});

test("returns no unbudgeted expenses for an empty month", () => {
  const result = calculateBudgetOverview([], {
    actualByCategory: new Map(),
    projectedByCategory: new Map(),
    uncategorizedActualAmount: 0,
    uncategorizedProjectedAmount: 0,
  });
  assert.deepEqual(result.unbudgetedItems, []);
  assert.equal(result.unbudgetedCommittedAmount, 0);
});

test("daily allowance spreads what was left at the start of today over the remaining days", () => {
  const allowance = calculateDailyBudgetAllowance({
    limit: 1_000,
    committedAmount: 430,
    spentTodayAmount: 30,
    period: "2026-11",
    today: "2026-11-21",
  });
  assert.deepEqual(allowance, {
    allowanceAmount: 60,
    spentTodayAmount: 30,
    remainingTodayAmount: 30,
    idealDailyAmount: 33.33,
    daysRemaining: 10,
    level: "healthy",
  });
});

test("daily allowance flags today's spending against the allowance with the usage levels", () => {
  const base = { limit: 300, period: "2026-11", today: "2026-11-30" };
  assert.equal(
    calculateDailyBudgetAllowance({ ...base, committedAmount: 280, spentTodayAmount: 80 })?.level,
    "attention",
  );
  assert.equal(
    calculateDailyBudgetAllowance({ ...base, committedAmount: 300, spentTodayAmount: 100 })?.level,
    "warning",
  );
  const exceeded = calculateDailyBudgetAllowance({
    ...base,
    committedAmount: 350,
    spentTodayAmount: 20,
  });
  assert.equal(exceeded?.allowanceAmount, 0);
  assert.equal(exceeded?.level, "critical");
});

test("daily allowance spreads future months over every day and skips past months", () => {
  const future = calculateDailyBudgetAllowance({
    limit: 600,
    committedAmount: 300,
    spentTodayAmount: 50,
    period: "2026-12",
    today: "2026-11-14",
  });
  assert.equal(future?.allowanceAmount, 9.67);
  assert.equal(future?.spentTodayAmount, 0);
  assert.equal(future?.daysRemaining, 31);
  assert.equal(
    calculateDailyBudgetAllowance({
      limit: 600,
      committedAmount: 0,
      spentTodayAmount: 0,
      period: "2026-10",
      today: "2026-11-14",
    }),
    null,
  );
});

test("budget overview reports four-step levels and sums the daily allowances", () => {
  const spending = calculateBudgetSpending(
    [
      {
        categoryId: "food",
        type: "expense",
        origin: "regular",
        amount: "-75",
        purchaseDate: "2026-11-01",
      },
      {
        categoryId: "food",
        type: "expense",
        origin: "regular",
        amount: "-10",
        purchaseDate: "2026-11-21",
      },
      {
        categoryId: "fun",
        type: "expense",
        origin: "regular",
        amount: "-20",
        purchaseDate: "2026-11-21",
      },
    ],
    [],
    "2026-11",
    "2026-11-21",
  );
  const result = calculateBudgetOverview(
    [
      { categoryId: "food", amount: 100 },
      { categoryId: "fun", amount: 220 },
    ],
    spending,
    { period: "2026-11", today: "2026-11-21" },
  );
  assert.equal(result.progressByCategory.get("food")?.level, "attention");
  assert.equal(result.progressByCategory.get("fun")?.level, "healthy");
  assert.equal(result.dailyByCategory.get("food")?.allowanceAmount, 2.5);
  assert.equal(result.dailyByCategory.get("fun")?.allowanceAmount, 22);
  assert.equal(result.daily?.allowanceAmount, 24.5);
  assert.equal(result.daily?.spentTodayAmount, 30);
  assert.equal(result.daily?.level, "critical");
});
