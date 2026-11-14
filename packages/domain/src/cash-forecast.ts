import type { CommitmentMonth } from "./commitments";
import { expandForecastSimulation, type ForecastSimulation } from "./forecast-simulations";
import { fromCents, toCents } from "./money";
import { getPeriodEndDate } from "./transactions";
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

/* ------------------------------------------------------------------------------------------ */
/* Daily view                                                                                 */
/* ------------------------------------------------------------------------------------------ */

/** The daily view starts on the current month and reaches this many months ahead at most. */
export const maxDailyCashForecastMonthsAhead = maxCashForecastMonths - 1;

export const cashEventKinds = ["income", "expense", "invoice", "simulation"] as const;
export type CashEventKind = (typeof cashEventKinds)[number];

/** Money expected to enter (positive) or leave (negative) the accounts on a given day. */
export type CashEvent = {
  date: string;
  amount: number;
  kind: CashEventKind;
  label: string;
};

/**
 * Variable spending expected in a month: the unspent budget. In the current month `todayAmount`
 * is what is still allowed today; the rest of `reserveAmount` is spread over the following days.
 */
export type DailyCashForecastBudget = {
  period: string;
  reserveAmount: number;
  todayAmount?: number;
  estimated: boolean;
};

export const cashForecastDayStatuses = ["past", "today", "future"] as const;
export type CashForecastDayStatus = (typeof cashForecastDayStatuses)[number];

export type CashForecastDay = {
  date: string;
  status: CashForecastDayStatus;
  /** Budget money expected to be spent on the day; `null` on past days, already realized. */
  dailyAmount: number | null;
  incomeAmount: number;
  expenseAmount: number;
  simulationAmount: number;
  closingBalance: number;
  level: UsageLevel;
  events: CashEvent[];
};

export type DailyCashForecast = {
  period: string;
  today: string;
  openingBalance: number;
  minimumBalance: number;
  budgetEstimated: boolean;
  days: CashForecastDay[];
  lowestBalance: { date: string; amount: number } | null;
  firstNegativeDate: string | null;
};

/**
 * Level of a day's balance against the minimum balance the user wants to keep: red when
 * negative, orange below half of the minimum, yellow below the minimum and green otherwise.
 */
export function resolveBalanceLevel(balance: number, minimumBalance: number): UsageLevel {
  const balanceCents = toCents(balance);
  const minimumCents = Math.max(0, toCents(minimumBalance));
  if (balanceCents < 0) return "critical";
  if (balanceCents < minimumCents / 2) return "warning";
  if (balanceCents < minimumCents) return "attention";
  return "healthy";
}

/**
 * Day a pending item is expected to move money: the scheduled boleto payment, else the due date,
 * else the purchase date. Anything already late and still unpaid is expected today.
 */
export function resolvePendingCashDate(input: {
  purchaseDate: string;
  dueDate?: string | null;
  boletoPaymentDate?: string | null;
  /** When given, late dates move to this day. */
  today?: string;
}) {
  const date = input.boletoPaymentDate ?? input.dueDate ?? input.purchaseDate;
  return input.today && date < input.today ? input.today : date;
}

/** Splits an amount in cents evenly over the dates; leftover cents land on the last date. */
export function spreadBudgetReserve(reserveCents: number, dates: readonly string[]) {
  const spread = new Map<string, number>();
  if (dates.length === 0 || reserveCents <= 0) return spread;
  const share = Math.floor(reserveCents / dates.length);
  for (const date of dates) spread.set(date, share);
  const last = dates[dates.length - 1] as string;
  spread.set(last, share + (reserveCents - share * dates.length));
  return spread;
}

/**
 * Projects the balance at the end of every day, from the first day of the current month to the
 * end of `period`, and returns the days of `period`. Past days and today carry the realized
 * postings; today and later days carry the pending events and the expected variable spending.
 * Simulated installments are expected on the first day of their month (today when it is past).
 */
export function calculateDailyCashForecast(input: {
  today: string;
  period: string;
  openingBalance: number;
  minimumBalance: number;
  realizedPostings: ReadonlyArray<{ date: string; amount: number }>;
  scheduledEvents: readonly CashEvent[];
  budgets: readonly DailyCashForecastBudget[];
  simulations: ReadonlyArray<ForecastSimulation & { label: string }>;
}): DailyCashForecast {
  const { today } = input;
  const currentPeriod = today.slice(0, 7);
  const firstDate = `${currentPeriod}-01`;
  const lastDate = toDateOnly(getPeriodEndDate(input.period));
  const dates = listDates(firstDate, lastDate);
  const clampDate = (date: string) => (date < firstDate ? firstDate : date);

  const realizedCents = new Map<string, number>();
  for (const posting of input.realizedPostings) {
    const date = clampDate(posting.date > lastDate ? lastDate : posting.date);
    realizedCents.set(date, (realizedCents.get(date) ?? 0) + toCents(posting.amount));
  }

  const eventsByDate = new Map<string, CashEvent[]>();
  const addEvent = (event: CashEvent) => {
    const date = event.date < today ? today : event.date;
    if (date > lastDate) return;
    const list = eventsByDate.get(date) ?? [];
    list.push({ ...event, date });
    eventsByDate.set(date, list);
  };
  for (const event of input.scheduledEvents) addEvent(event);
  for (const simulation of input.simulations) {
    for (const installment of expandForecastSimulation(simulation)) {
      addEvent({
        date: `${installment.period}-01`,
        amount: -installment.amount,
        kind: "simulation",
        label: simulation.label,
      });
    }
  }

  const budgetCents = new Map<string, number>();
  for (const budget of input.budgets) {
    const periodDates = dates.filter((date) => date.startsWith(budget.period) && date >= today);
    if (periodDates.length === 0) continue;
    const reserveCents = Math.max(0, toCents(budget.reserveAmount));
    let spreadDates = periodDates;
    let remainingCents = reserveCents;
    if (budget.todayAmount !== undefined && periodDates[0] === today) {
      const todayCents = Math.min(remainingCents, Math.max(0, toCents(budget.todayAmount)));
      budgetCents.set(today, todayCents);
      remainingCents -= todayCents;
      spreadDates = periodDates.slice(1);
    }
    for (const [date, cents] of spreadBudgetReserve(remainingCents, spreadDates)) {
      budgetCents.set(date, (budgetCents.get(date) ?? 0) + cents);
    }
  }

  let balanceCents = toCents(input.openingBalance);
  let periodOpeningCents = balanceCents;
  const days: CashForecastDay[] = [];
  for (const date of dates) {
    if (date === `${input.period}-01`) periodOpeningCents = balanceCents;
    const events = (eventsByDate.get(date) ?? []).sort(
      (left, right) => left.amount - right.amount || left.label.localeCompare(right.label),
    );
    const realized = realizedCents.get(date) ?? 0;
    const dailyCents = budgetCents.get(date) ?? 0;
    let incomeCents = Math.max(0, realized);
    let expenseCents = Math.max(0, -realized);
    let simulationCents = 0;
    for (const event of events) {
      const cents = toCents(event.amount);
      if (event.kind === "simulation") simulationCents += -cents;
      else if (cents >= 0) incomeCents += cents;
      else expenseCents += -cents;
    }
    balanceCents += incomeCents - expenseCents - simulationCents - dailyCents;
    if (!date.startsWith(input.period)) continue;

    const status: CashForecastDayStatus =
      date < today ? "past" : date === today ? "today" : "future";
    days.push({
      date,
      status,
      dailyAmount: status === "past" ? null : fromCents(dailyCents),
      incomeAmount: fromCents(incomeCents),
      expenseAmount: fromCents(expenseCents),
      simulationAmount: fromCents(simulationCents),
      closingBalance: fromCents(balanceCents),
      level: resolveBalanceLevel(fromCents(balanceCents), input.minimumBalance),
      events,
    });
  }

  const lowest = days.reduce<CashForecastDay | null>(
    (current, day) =>
      current === null || day.closingBalance < current.closingBalance ? day : current,
    null,
  );
  return {
    period: input.period,
    today,
    openingBalance: fromCents(periodOpeningCents),
    minimumBalance: fromCents(Math.max(0, toCents(input.minimumBalance))),
    budgetEstimated: input.budgets.some(
      (budget) => budget.period === input.period && budget.estimated,
    ),
    days,
    lowestBalance: lowest ? { date: lowest.date, amount: lowest.closingBalance } : null,
    firstNegativeDate: days.find((day) => day.closingBalance < 0)?.date ?? null,
  };
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function listDates(firstDate: string, lastDate: string) {
  const dates: string[] = [];
  for (
    let cursor = new Date(`${firstDate}T00:00:00Z`);
    toDateOnly(cursor) <= lastDate;
    cursor = new Date(cursor.getTime() + 86_400_000)
  ) {
    dates.push(toDateOnly(cursor));
  }
  return dates;
}
