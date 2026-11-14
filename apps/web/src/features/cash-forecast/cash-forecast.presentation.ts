import { defaultCashForecastMonths } from "@openmonetis/domain/cash-forecast";
import { getCurrentPeriodInBrazil } from "@openmonetis/shared/date-time";
import {
  type CashForecastMonthOutput,
  type CashForecastQuery,
  CashForecastQuerySchema,
} from "@openmonetis/validators/cash-forecast";

export const cashForecastMonthOptions = [6, 12, 18, 24] as const;

export const cashForecastViews = ["monthly", "daily"] as const;
export type CashForecastView = (typeof cashForecastViews)[number];

export function validateCashForecastSearch(search: Record<string, unknown>) {
  return {
    view: cashForecastViews.find((view) => view === search.view),
    period: CashForecastQuerySchema.shape.startPeriod.safeParse(search.period).data,
    months: CashForecastQuerySchema.shape.months.safeParse(search.months).data,
  };
}

export function resolveCashForecastSearch(
  search: ReturnType<typeof validateCashForecastSearch>,
): CashForecastQuery {
  return {
    startPeriod: search.period ?? getCurrentPeriodInBrazil(),
    months: search.months ?? defaultCashForecastMonths,
  };
}

/** A month only turns red when its closing balance is negative. */
export const cashForecastLevelLabels: Record<CashForecastMonthOutput["level"], string> = {
  healthy: "Tranquilo",
  attention: "Atenção",
  warning: "Apertado",
  critical: "Negativo",
};

export function formatCashForecastPercentage(value: number | null) {
  return value === null
    ? "—"
    : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}%`;
}

/** Outflows read as negative money in the spreadsheet; zero stays "R$ 0,00" instead of "-R$ 0,00". */
export function asOutflow(amount: number) {
  return amount === 0 ? 0 : -amount;
}

/** The daily view starts on the current month: earlier months show the current one. */
export function resolveDailyCashForecastPeriod(period: string) {
  const currentPeriod = getCurrentPeriodInBrazil();
  return period < currentPeriod ? currentPeriod : period;
}

export const dailyBalanceLevelLabels: Record<CashForecastMonthOutput["level"], string> = {
  healthy: "acima do saldo mínimo",
  attention: "abaixo do saldo mínimo",
  warning: "abaixo da metade do mínimo",
  critical: "saldo negativo",
};

const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });

/** "14" and "sáb" for a `YYYY-MM-DD` date. */
export function formatForecastDay(date: string) {
  return {
    day: String(Number(date.slice(8, 10))),
    weekday: weekdayFormatter.format(new Date(`${date}T12:00:00Z`)).replace(".", ""),
  };
}

export function formatForecastDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(".", "")
    .replace(" de ", " ");
}
