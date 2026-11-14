import { defaultCashForecastMonths } from "@openmonetis/domain/cash-forecast";
import { getCurrentPeriodInBrazil } from "@openmonetis/shared/date-time";
import {
  type CashForecastMonthOutput,
  type CashForecastQuery,
  CashForecastQuerySchema,
} from "@openmonetis/validators/cash-forecast";

export const cashForecastMonthOptions = [6, 12, 18, 24] as const;

export function validateCashForecastSearch(search: Record<string, unknown>) {
  return {
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
