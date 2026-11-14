import type { CommitmentMonth } from "./commitments";
import { expandForecastSimulation, type ForecastSimulation } from "./forecast-simulations";
import { fromCents, toCents } from "./money";
import { resolveUsageLevel, type UsageLevel } from "./usage-levels";

export const defaultCashForecastMonths = 12;
export const maxCashForecastMonths = 24;

/**
 * Budget money not spent yet in a month. The forecast assumes it will be spent, so variable
 * expenses are not mistaken for free money. `estimated` marks limits inherited from an earlier
 * month because the period has no budget of its own yet.
 */
export type CashForecastBudgetReserve = {
  period: string;
  amount: number;
  estimated: boolean;
};

export type CashForecastMonth = {
  period: string;
  openingBalance: number;
  incomeAmount: number;
  /** Installments, recurring expenses and bills already launched, net of refunds. */
  committedAmount: number;
  budgetReserveAmount: number;
  budgetReserveEstimated: boolean;
  simulationAmount: number;
  outflowAmount: number;
  netAmount: number;
  closingBalance: number;
  /** Closing balance the month would have without any active simulation. */
  baselineClosingBalance: number;
  /** Outflow share of the money available in the month (opening balance plus income). */
  usagePercentage: number | null;
  level: UsageLevel;
};

export type CashForecast = {
  startPeriod: string;
  openingBalance: number;
  months: CashForecastMonth[];
  lowestBalance: { period: string; amount: number } | null;
  firstNegativePeriod: string | null;
  /** Total simulated outflow inside the forecast window. */
  simulationsAmount: number;
};

/**
 * Balance the forecast starts from: active accounts that count towards the total balance, as
 * they closed the month before the forecast.
 */
export function calculateCashForecastOpeningBalance(
  accounts: ReadonlyArray<{ isArchived: boolean; excludeFromBalance: boolean; balance: number }>,
) {
  return fromCents(
    accounts
      .filter((account) => !account.isArchived && !account.excludeFromBalance)
      .reduce((total, account) => total + toCents(account.balance), 0),
  );
}

/**
 * Projects the balance month by month: each month starts with the previous closing balance,
 * receives the expected income and pays commitments, the unspent budget and the active
 * simulations. Commitments are taken as calculated by the commitments report, never recalculated.
 */
export function calculateCashForecast(input: {
  openingBalance: number;
  commitments: readonly CommitmentMonth[];
  budgetReserves: readonly CashForecastBudgetReserve[];
  simulations: readonly ForecastSimulation[];
}): CashForecast {
  const reserves = new Map(input.budgetReserves.map((reserve) => [reserve.period, reserve]));
  const simulatedCents = new Map<string, number>();
  for (const simulation of input.simulations) {
    for (const installment of expandForecastSimulation(simulation)) {
      simulatedCents.set(
        installment.period,
        (simulatedCents.get(installment.period) ?? 0) + toCents(installment.amount),
      );
    }
  }

  const openingCents = toCents(input.openingBalance);
  let balanceCents = openingCents;
  let baselineCents = openingCents;
  let simulationsCents = 0;
  const months = input.commitments.map((commitment): CashForecastMonth => {
    const reserve = reserves.get(commitment.period);
    const incomeCents = toCents(commitment.incomeAmount);
    const committedCents = toCents(commitment.committedAmount);
    const reserveCents = Math.max(0, toCents(reserve?.amount ?? 0));
    const simulationCents = simulatedCents.get(commitment.period) ?? 0;
    const outflowCents = committedCents + reserveCents + simulationCents;
    const availableCents = balanceCents + incomeCents;
    const monthOpeningCents = balanceCents;

    balanceCents = availableCents - outflowCents;
    baselineCents += incomeCents - committedCents - reserveCents;
    simulationsCents += simulationCents;

    const usagePercentage =
      availableCents > 0 ? Math.round((outflowCents / availableCents) * 1000) / 10 : null;
    return {
      period: commitment.period,
      openingBalance: fromCents(monthOpeningCents),
      incomeAmount: fromCents(incomeCents),
      committedAmount: fromCents(committedCents),
      budgetReserveAmount: fromCents(reserveCents),
      budgetReserveEstimated: reserve?.estimated ?? false,
      simulationAmount: fromCents(simulationCents),
      outflowAmount: fromCents(outflowCents),
      netAmount: fromCents(incomeCents - outflowCents),
      closingBalance: fromCents(balanceCents),
      baselineClosingBalance: fromCents(baselineCents),
      usagePercentage,
      level: balanceCents < 0 ? "critical" : resolveUsageLevel(usagePercentage, outflowCents),
    };
  });

  const lowest = months.reduce<CashForecastMonth | null>(
    (current, month) =>
      current === null || month.closingBalance < current.closingBalance ? month : current,
    null,
  );

  return {
    startPeriod: input.commitments[0]?.period ?? "",
    openingBalance: fromCents(openingCents),
    months,
    lowestBalance: lowest ? { period: lowest.period, amount: lowest.closingBalance } : null,
    firstNegativePeriod: months.find((month) => month.closingBalance < 0)?.period ?? null,
    simulationsAmount: fromCents(simulationsCents),
  };
}
