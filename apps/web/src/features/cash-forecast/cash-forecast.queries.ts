import type { CashForecastQuery } from "@openmonetis/validators/cash-forecast";
import { queryOptions } from "@tanstack/react-query";
import { getCashForecast, getDailyCashForecast } from "./cash-forecast.api";

export function cashForecastQueryOptions(query: CashForecastQuery) {
  return queryOptions({
    queryKey: ["cash-forecast", query.startPeriod, query.months],
    queryFn: () => getCashForecast(query),
  });
}

export function dailyCashForecastQueryOptions(period: string) {
  return queryOptions({
    queryKey: ["cash-forecast", "daily", period],
    queryFn: () => getDailyCashForecast(period),
  });
}
