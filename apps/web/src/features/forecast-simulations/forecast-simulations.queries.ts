import { queryOptions } from "@tanstack/react-query";
import { getForecastSimulations } from "./forecast-simulations.api";

export const forecastSimulationKeys = {
  all: ["forecast-simulations"] as const,
};

export function forecastSimulationsQueryOptions() {
  return queryOptions({
    queryKey: forecastSimulationKeys.all,
    queryFn: getForecastSimulations,
  });
}
