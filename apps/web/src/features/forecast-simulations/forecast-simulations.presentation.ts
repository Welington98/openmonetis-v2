import type { ForecastSimulationOutput } from "@openmonetis/validators/forecast-simulations";
import { formatPeriod } from "@/lib/period-presentation";

export function formatForecastSimulationSchedule(
  simulation: Pick<ForecastSimulationOutput, "installmentCount" | "firstPeriod" | "endPeriod">,
) {
  if (simulation.installmentCount === 1) {
    return `À vista em ${formatPeriod(simulation.firstPeriod, true)}`;
  }
  return `${simulation.installmentCount}x · ${formatPeriod(simulation.firstPeriod, true)} a ${formatPeriod(simulation.endPeriod, true)}`;
}
