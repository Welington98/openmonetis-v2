import {
  type CashForecastBudgetReserve,
  calculateCashForecast,
  calculateCashForecastOpeningBalance,
} from "@openmonetis/domain/cash-forecast";
import type { ForecastSimulation } from "@openmonetis/domain/forecast-simulations";
import { addMonthsToPeriod } from "@openmonetis/domain/transactions";
import type { CashForecastOutput, CashForecastQuery } from "@openmonetis/validators/cash-forecast";
import type { CommitmentsOutput } from "@openmonetis/validators/commitments";

export type CashForecastDependencies = {
  commitments: {
    list(
      userId: string,
      query: { startPeriod: string; endPeriod: string },
    ): Promise<Pick<CommitmentsOutput, "months">>;
  };
  budgets: {
    projectReserve(userId: string, period: string): Promise<CashForecastBudgetReserve>;
  };
  /** Accounts as summarized through a period; their balance closes that period. */
  accounts: {
    list(
      userId: string,
      period: string,
    ): Promise<
      Array<{ isArchived: boolean; excludeFromBalance: boolean; summary: { balance: number } }>
    >;
  };
  simulations: { listActive(userId: string): Promise<ForecastSimulation[]> };
};

export function createCashForecastService(dependencies: CashForecastDependencies) {
  return {
    async get(userId: string, query: CashForecastQuery): Promise<CashForecastOutput> {
      const periods = Array.from({ length: query.months }, (_, index) =>
        addMonthsToPeriod(query.startPeriod, index),
      );
      const [commitments, budgetReserves, accounts, simulations] = await Promise.all([
        dependencies.commitments.list(userId, {
          startPeriod: query.startPeriod,
          endPeriod: periods.at(-1) as string,
        }),
        Promise.all(periods.map((period) => dependencies.budgets.projectReserve(userId, period))),
        dependencies.accounts.list(userId, addMonthsToPeriod(query.startPeriod, -1)),
        dependencies.simulations.listActive(userId),
      ]);
      return calculateCashForecast({
        openingBalance: calculateCashForecastOpeningBalance(
          accounts.map((account) => ({ ...account, balance: account.summary.balance })),
        ),
        commitments: commitments.months,
        budgetReserves,
        simulations,
      });
    },
  };
}

export type CashForecastService = ReturnType<typeof createCashForecastService>;
