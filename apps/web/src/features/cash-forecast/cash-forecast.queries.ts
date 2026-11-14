import type { CashForecastQuery } from "@openmonetis/validators/cash-forecast";
import { queryOptions } from "@tanstack/react-query";
import { getCashForecast } from "./cash-forecast.api";

export function cashForecastQueryOptions(query: CashForecastQuery) {
  return queryOptions({
    queryKey: ["cash-forecast", query.startPeriod, query.months],
    queryFn: () => getCashForecast(query),
  });
}
