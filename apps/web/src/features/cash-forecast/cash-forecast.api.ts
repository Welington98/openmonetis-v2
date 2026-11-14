import type {
  CashForecastOutput,
  CashForecastQuery,
  DailyCashForecastOutput,
} from "@openmonetis/validators/cash-forecast";
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

export function getDailyCashForecast(period: string) {
  return requestApi<DailyCashForecastOutput>(
    `/reports/cash-forecast/daily?${new URLSearchParams({ period })}`,
    undefined,
    { useResponseMessage: true },
  );
}
