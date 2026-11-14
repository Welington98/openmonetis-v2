import assert from "node:assert/strict";
import test from "node:test";
import type { CommitmentMonth } from "@openmonetis/domain/commitments";
import { createCashForecastService } from "./cash-forecast.service";

function commitment(
  period: string,
  incomeAmount: number,
  committedAmount: number,
): CommitmentMonth {
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

test("cash forecast opens with the previous month's balances and combines every source", async () => {
  const reads: string[] = [];
  const service = createCashForecastService({
    commitments: {
      async list(userId, query) {
        reads.push(`commitments:${userId}:${query.startPeriod}:${query.endPeriod}`);
        return {
          months: [
            commitment("2026-11", 5_000, 3_000),
            commitment("2026-12", 5_000, 3_500),
            commitment("2027-01", 5_000, 3_000),
          ],
        };
      },
    },
    budgets: {
      async projectReserve(userId, period) {
        reads.push(`budgets:${userId}:${period}`);
        return { period, amount: 1_000, estimated: period !== "2026-11" };
      },
    },
    accounts: {
      async list(userId, period) {
        reads.push(`accounts:${userId}:${period}`);
        return [
          { isArchived: false, excludeFromBalance: false, summary: { balance: 2_000 } },
          { isArchived: false, excludeFromBalance: true, summary: { balance: 50_000 } },
        ];
      },
    },
    simulations: {
      async listActive(userId) {
        reads.push(`simulations:${userId}`);
        return [{ amount: "2400.00", installmentCount: 2, firstPeriod: "2026-12" }];
      },
    },
  });

  const forecast = await service.get("owner", { startPeriod: "2026-11", months: 3 });

  assert.ok(reads.includes("commitments:owner:2026-11:2027-01"));
  assert.ok(reads.includes("accounts:owner:2026-10"));
  assert.equal(reads.filter((read) => read.startsWith("budgets:owner")).length, 3);
  assert.equal(forecast.openingBalance, 2_000);
  assert.deepEqual(
    forecast.months.map((month) => [
      month.period,
      month.closingBalance,
      month.baselineClosingBalance,
      month.budgetReserveEstimated,
    ]),
    [
      ["2026-11", 3_000, 3_000, false],
      ["2026-12", 2_300, 3_500, true],
      ["2027-01", 2_100, 4_500, true],
    ],
  );
  assert.equal(forecast.simulationsAmount, 2_400);
});
