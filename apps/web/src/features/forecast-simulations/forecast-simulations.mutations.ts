import type { UpdateForecastSimulationInput } from "@openmonetis/validators/forecast-simulations";
import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createForecastSimulation,
  deleteForecastSimulation,
  updateForecastSimulation,
} from "./forecast-simulations.api";

/** A simulation only changes the forecast, never real balances, so only these two refresh. */
function refreshForecast(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: ["forecast-simulations"] }),
    client.invalidateQueries({ queryKey: ["cash-forecast"] }),
  ]);
}

export function useCreateForecastSimulationMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createForecastSimulation,
    onSuccess: () => refreshForecast(client),
  });
}

export function useUpdateForecastSimulationMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateForecastSimulationInput }) =>
      updateForecastSimulation(id, input),
    onSuccess: () => refreshForecast(client),
  });
}

export function useDeleteForecastSimulationMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteForecastSimulation,
    onSuccess: () => refreshForecast(client),
  });
}
