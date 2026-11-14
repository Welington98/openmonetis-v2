import type { CashForecastOutput, CashForecastQuery } from "@openmonetis/validators/cash-forecast";
import { requestApi } from "@/lib/api-client";

export function getCashForecast(query: CashForecastQuery) {
  const params = new URLSearchParams({
    startPeriod: query.startPeriod,
    months: String(query.months),
  });
  return requestApi<CashForecastOutput>(`/reports/cash-forecast?${params}`, undefined, {
    useResponseMessage: true,
  });
}
