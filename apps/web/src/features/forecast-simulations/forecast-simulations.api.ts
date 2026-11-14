import type {
  CreateForecastSimulationInput,
  ForecastSimulationOutput,
  UpdateForecastSimulationInput,
} from "@openmonetis/validators/forecast-simulations";
import { requestApiWithResponseMessage as request } from "@/lib/api-client";

export function getForecastSimulations() {
  return request<ForecastSimulationOutput[]>("/forecast-simulations");
}

export function createForecastSimulation(input: CreateForecastSimulationInput) {
  return request<ForecastSimulationOutput>("/forecast-simulations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateForecastSimulation(id: string, input: UpdateForecastSimulationInput) {
  return request<ForecastSimulationOutput>(`/forecast-simulations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteForecastSimulation(id: string) {
  return request<{ id: string }>(`/forecast-simulations/${id}`, { method: "DELETE" });
}
