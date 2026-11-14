import assert from "node:assert/strict";
import test from "node:test";
import type { CommitmentMonth } from "@openmonetis/domain/commitments";
import {
  type CashForecastDependencies,
  createCashForecastService,
  type ScheduledTransactionRecord,
} from "./cash-forecast.service";

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

function transaction(values: Partial<ScheduledTransactionRecord>): ScheduledTransactionRecord {
  return {
    name: "Lançamento",
    type: "expense",
    period: "2026-11",
    paymentMethod: "pix",
    purchaseDate: "2026-11-01",
    dueDate: null,
    boletoPaymentDate: null,
    settledDate: null,
    isSettled: false,
    amount: -10,
    ...values,
  };
}

function fixture(overrides: Partial<CashForecastDependencies> = {}) {
  const reads: string[] = [];
  const dependencies: CashForecastDependencies = {
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
        return {
          period,
          amount: period === "2026-11" ? 1_000 : 310,
          estimated: period !== "2026-11",
        };
      },
      async list(userId, query) {
        reads.push(`budget-list:${userId}:${query.period}`);
        return {
          allocatedAmount: 1_500,
          availableAmount: 170,
          items: [{}],
          daily: { remainingTodayAmount: 10 },
        };
      },
    },
    accounts: {
      async list(userId, period) {
        reads.push(`accounts:${userId}:${period}`);
        return [
          { id: "main", isArchived: false, excludeFromBalance: false, summary: { balance: 2_000 } },
          {
            id: "vault",
            isArchived: false,
            excludeFromBalance: true,
            summary: { balance: 50_000 },
          },
        ];
      },
      async listDailyPostings() {
        return [{ date: "2026-11-05", amount: 1_000 }];
      },
      async listScheduledRecurringOccurrences() {
        return [{ date: "2026-12-05", amount: 5_000, name: "Salário" }];
      },
    },
    invoices: {
      async get(period) {
        return {
          items: [
            {
              accountId: "main",
              cardName: "Nubank",
              dueDate: `${period}-10`,
              remainingAmount: 400,
            },
            {
              accountId: "vault",
              cardName: "Outro",
              dueDate: `${period}-10`,
              remainingAmount: 900,
            },
          ],
        };
      },
    },
    simulations: {
      async listActive(userId) {
        reads.push(`simulations:${userId}`);
        return [
          { label: "Notebook", amount: "2400.00", installmentCount: 2, firstPeriod: "2026-12" },
        ];
      },
    },
    preferences: {
      async get() {
        return { forecastMinimumBalance: null };
      },
    },
    repository: {
      async listScheduledTransactions(_userId, fromPeriod, toPeriod) {
        reads.push(`transactions:${fromPeriod}:${toPeriod}`);
        return [
          transaction({ name: "Aluguel", dueDate: "2026-11-20", amount: -1_500 }),
          transaction({ name: "Conta antiga", purchaseDate: "2026-11-02", amount: -50 }),
          transaction({ name: "Já paga", isSettled: true, settledDate: "2026-11-03", amount: -99 }),
          transaction({
            name: "Pix agendado",
            period: "2026-12",
            isSettled: true,
            purchaseDate: "2026-12-15",
            amount: -200,
          }),
        ];
      },
    },
    today: () => "2026-11-14",
    ...overrides,
  };
  return { reads, service: createCashForecastService(dependencies) };
}

test("cash forecast opens with the previous month's balances and combines every source", async () => {
  const { reads, service } = fixture();
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
      ["2026-12", 2_990, 4_190, true],
      ["2027-01", 3_480, 5_880, true],
    ],
  );
  assert.equal(forecast.simulationsAmount, 2_400);
});

test("daily forecast places pending items on their cash day and skips what balances already hold", async () => {
  const { service } = fixture();
  const forecast = await service.getDaily("owner", { period: "2026-11" });
  const day = (date: string) => forecast.days.find((item) => item.date === date);

  assert.equal(forecast.minimumBalanceSource, "automatic");
  assert.equal(forecast.minimumBalance, 1_500);
  assert.equal(day("2026-11-05")?.closingBalance, 3_000);
  assert.equal(day("2026-11-10")?.expenseAmount, 0);
  assert.deepEqual(
    day("2026-11-14")?.events.map((event) => event.label),
    ["Fatura Nubank", "Conta antiga"],
  );
  assert.equal(day("2026-11-14")?.dailyAmount, 10);
  assert.equal(day("2026-11-14")?.closingBalance, 2_540);
  assert.equal(day("2026-11-20")?.events[0]?.label, "Aluguel");
  assert.equal(
    forecast.days.some((item) => item.events.some((event) => event.label === "Já paga")),
    false,
  );
  assert.equal(forecast.days.at(-1)?.closingBalance, 880);
  assert.equal(forecast.days.at(-1)?.level, "attention");
});

test("daily forecast chains later months with recurring income, invoices and simulations", async () => {
  const { service } = fixture({
    preferences: {
      async get() {
        return { forecastMinimumBalance: 100 };
      },
    },
  });
  const forecast = await service.getDaily("owner", { period: "2026-12" });
  const day = (date: string) => forecast.days.find((item) => item.date === date);

  assert.equal(forecast.minimumBalanceSource, "custom");
  assert.equal(forecast.openingBalance, 880);
  assert.equal(forecast.budgetEstimated, true);
  assert.equal(day("2026-12-01")?.simulationAmount, 1_200);
  assert.equal(day("2026-12-05")?.incomeAmount, 5_000);
  assert.equal(day("2026-12-10")?.events[0]?.label, "Fatura Nubank");
  assert.equal(day("2026-12-15")?.events[0]?.label, "Pix agendado");
  assert.equal(forecast.days.at(-1)?.closingBalance, 3_770);
});

test("daily forecast refuses months before the current one or beyond the horizon", async () => {
  const { service } = fixture();
  await assert.rejects(service.getDaily("owner", { period: "2026-10" }), {
    code: "cash_forecast_period_in_past",
  });
  await assert.rejects(service.getDaily("owner", { period: "2028-11" }), {
    code: "cash_forecast_period_too_far",
  });
});
