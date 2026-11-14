import {
  type CashEvent,
  type CashForecastBudgetReserve,
  calculateCashForecast,
  calculateCashForecastOpeningBalance,
  calculateDailyCashForecast,
  type DailyCashForecastBudget,
  maxDailyCashForecastMonthsAhead,
  resolvePendingCashDate,
} from "@openmonetis/domain/cash-forecast";
import type { ForecastSimulation } from "@openmonetis/domain/forecast-simulations";
import {
  addMonthsToPeriod,
  deriveTransactionPostingDate,
  deriveTransactionPostingPeriod,
  type PaymentMethod,
  type TransactionType,
} from "@openmonetis/domain/transactions";
import { getCurrentDateInBrazil } from "@openmonetis/shared/date-time";
import type {
  CashForecastOutput,
  CashForecastQuery,
  DailyCashForecastOutput,
  DailyCashForecastQuery,
} from "@openmonetis/validators/cash-forecast";
import type { CommitmentsOutput } from "@openmonetis/validators/commitments";
import { badRequest } from "../utils/errors";

export type ScheduledTransactionRecord = {
  name: string;
  type: TransactionType;
  period: string;
  paymentMethod: PaymentMethod | null;
  purchaseDate: string;
  dueDate: string | null;
  boletoPaymentDate: string | null;
  settledDate: string | null;
  isSettled: boolean | null;
  /** Signed share of the primary person: income positive, expenses negative. */
  amount: number;
};

export type CashForecastRepository = {
  listScheduledTransactions(
    userId: string,
    fromPeriod: string,
    toPeriod: string,
  ): Promise<ScheduledTransactionRecord[]>;
};

export type CashForecastDependencies = {
  commitments: {
    list(
      userId: string,
      query: { startPeriod: string; endPeriod: string },
    ): Promise<Pick<CommitmentsOutput, "months">>;
  };
  budgets: {
    projectReserve(userId: string, period: string): Promise<CashForecastBudgetReserve>;
    list(
      userId: string,
      query: { period: string },
    ): Promise<{
      allocatedAmount: number;
      availableAmount: number;
      items: unknown[];
      daily: { remainingTodayAmount: number } | null;
    }>;
  };
  /** Accounts as summarized through a period; their balance closes that period. */
  accounts: {
    list(
      userId: string,
      period: string,
    ): Promise<
      Array<{
        id: string;
        isArchived: boolean;
        excludeFromBalance: boolean;
        summary: { balance: number };
      }>
    >;
    listDailyPostings(
      userId: string,
      period: string,
    ): Promise<Array<{ date: string; amount: number }>>;
    listScheduledRecurringOccurrences(
      userId: string,
      fromPeriod: string,
      toPeriod: string,
    ): Promise<Array<{ date: string; amount: number; name: string }>>;
  };
  invoices: {
    get(
      period: string,
      userId: string,
    ): Promise<{
      items: Array<{
        accountId: string;
        cardName: string;
        dueDate: string;
        remainingAmount: number;
      }>;
    }>;
  };
  simulations: {
    listActive(userId: string): Promise<Array<ForecastSimulation & { label: string }>>;
  };
  preferences: { get(userId: string): Promise<{ forecastMinimumBalance: number | null }> };
  repository: CashForecastRepository;
  today?: () => string;
};

export function createCashForecastService(dependencies: CashForecastDependencies) {
  const today = dependencies.today ?? getCurrentDateInBrazil;

  /** Pending account transactions and card invoices, each on the day it should move money. */
  async function listScheduledEvents(
    userId: string,
    currentPeriod: string,
    periods: string[],
    includedAccountIds: Set<string>,
  ): Promise<CashEvent[]> {
    const lastPeriod = periods.at(-1) as string;
    const [transactions, recurring, invoices] = await Promise.all([
      dependencies.repository.listScheduledTransactions(userId, currentPeriod, lastPeriod),
      dependencies.accounts.listScheduledRecurringOccurrences(userId, currentPeriod, lastPeriod),
      Promise.all(periods.map((period) => dependencies.invoices.get(period, userId))),
    ]);
    const events: CashEvent[] = [];
    const toEvent = (date: string, amount: number, label: string): CashEvent => ({
      date,
      amount,
      kind: amount >= 0 ? "income" : "expense",
      label,
    });

    for (const transaction of transactions) {
      if (transaction.amount === 0) continue;
      if (transaction.isSettled === true) {
        const postingPeriod = deriveTransactionPostingPeriod({
          period: transaction.period,
          paymentMethod: transaction.paymentMethod,
          boletoPaymentDate: transaction.boletoPaymentDate,
          settledDate: transaction.settledDate,
        });
        // Settled through the current month: already in the balances.
        if (postingPeriod <= currentPeriod) continue;
        events.push(
          toEvent(
            deriveTransactionPostingDate({ ...transaction, isSettled: true }) as string,
            transaction.amount,
            transaction.name,
          ),
        );
        continue;
      }
      events.push(
        toEvent(resolvePendingCashDate(transaction), transaction.amount, transaction.name),
      );
    }
    for (const occurrence of recurring) {
      events.push(toEvent(occurrence.date, occurrence.amount, occurrence.name));
    }
    for (const invoice of invoices.flatMap((overview) => overview.items)) {
      if (invoice.remainingAmount <= 0 || !includedAccountIds.has(invoice.accountId)) continue;
      events.push({
        date: invoice.dueDate,
        amount: -invoice.remainingAmount,
        kind: "invoice",
        label: `Fatura ${invoice.cardName}`,
      });
    }
    return events;
  }

  /** Variable spending per period: today's allowance this month, unspent budgets afterwards. */
  async function listDailyBudgets(userId: string, currentPeriod: string, periods: string[]) {
    const [current, later] = await Promise.all([
      dependencies.budgets.list(userId, { period: currentPeriod }),
      Promise.all(
        periods.slice(1).map((period) => dependencies.budgets.projectReserve(userId, period)),
      ),
    ]);
    const toBudget = (reserve: CashForecastBudgetReserve): DailyCashForecastBudget => ({
      period: reserve.period,
      reserveAmount: reserve.amount,
      estimated: reserve.estimated,
    });
    // Without budgets of its own, the current month inherits the latest limits, spread evenly.
    const currentBudget: DailyCashForecastBudget =
      current.items.length > 0
        ? {
            period: currentPeriod,
            reserveAmount: current.availableAmount,
            todayAmount: current.daily?.remainingTodayAmount,
            estimated: false,
          }
        : toBudget(await dependencies.budgets.projectReserve(userId, currentPeriod));
    return {
      allocatedAmount: current.allocatedAmount,
      budgets: [currentBudget, ...later.map(toBudget)],
    };
  }

  return {
    async getDaily(
      userId: string,
      query: DailyCashForecastQuery,
    ): Promise<DailyCashForecastOutput> {
      const referenceDay = today();
      const currentPeriod = referenceDay.slice(0, 7);
      if (query.period < currentPeriod) {
        throw badRequest(
          "The daily forecast starts on the current month",
          "cash_forecast_period_in_past",
        );
      }
      if (query.period > addMonthsToPeriod(currentPeriod, maxDailyCashForecastMonthsAhead)) {
        throw badRequest(
          "The daily forecast period is too far ahead",
          "cash_forecast_period_too_far",
        );
      }
      const periods: string[] = [];
      for (
        let period = currentPeriod;
        period <= query.period;
        period = addMonthsToPeriod(period, 1)
      ) {
        periods.push(period);
      }

      const [accounts, realizedPostings, simulations, preferences, dailyBudgets] =
        await Promise.all([
          dependencies.accounts.list(userId, addMonthsToPeriod(currentPeriod, -1)),
          dependencies.accounts.listDailyPostings(userId, currentPeriod),
          dependencies.simulations.listActive(userId),
          dependencies.preferences.get(userId),
          listDailyBudgets(userId, currentPeriod, periods),
        ]);
      const includedAccountIds = new Set(
        accounts
          .filter((account) => !account.isArchived && !account.excludeFromBalance)
          .map((account) => account.id),
      );
      const scheduledEvents = await listScheduledEvents(
        userId,
        currentPeriod,
        periods,
        includedAccountIds,
      );
      const minimumBalance = preferences.forecastMinimumBalance ?? dailyBudgets.allocatedAmount;

      return {
        ...calculateDailyCashForecast({
          today: referenceDay,
          period: query.period,
          openingBalance: calculateCashForecastOpeningBalance(
            accounts.map((account) => ({ ...account, balance: account.summary.balance })),
          ),
          minimumBalance,
          realizedPostings,
          scheduledEvents,
          budgets: dailyBudgets.budgets,
          simulations,
        }),
        minimumBalanceSource: preferences.forecastMinimumBalance === null ? "automatic" : "custom",
      };
    },

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
