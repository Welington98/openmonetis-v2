import {
  addMonthsToPeriod,
  maximumInstallmentCount,
  splitAmountIntoInstallments,
} from "./transactions";

/** A simulation can be a single purchase or split into as many installments as a real series. */
export const maxForecastSimulationInstallments = maximumInstallmentCount;
export const maxForecastSimulationsPerUser = 100;

/**
 * A purchase that does not exist yet, saved so its impact on the coming months can be compared
 * with and without it. It never becomes a transaction and never affects any other total.
 */
export type ForecastSimulationDraft = {
  userId: string;
  description: string;
  amount: string;
  installmentCount: number;
  firstPeriod: string;
  isActive: boolean;
};

export type ForecastSimulation = {
  amount: string | number;
  installmentCount: number;
  firstPeriod: string;
};

export function createForecastSimulationDraft(input: {
  userId: string;
  description: string;
  amount: number;
  installmentCount: number;
  firstPeriod: string;
  isActive?: boolean;
}): ForecastSimulationDraft {
  return {
    userId: input.userId,
    description: input.description.trim(),
    amount: input.amount.toFixed(2),
    installmentCount: input.installmentCount,
    firstPeriod: input.firstPeriod,
    isActive: input.isActive ?? true,
  };
}

/** Splits the simulated amount month by month exactly like a real installment series. */
export function expandForecastSimulation(
  simulation: ForecastSimulation,
): Array<{ period: string; amount: number }> {
  return splitAmountIntoInstallments(
    Math.abs(Number(simulation.amount)),
    simulation.installmentCount,
  ).map((amount, index) => ({ period: addMonthsToPeriod(simulation.firstPeriod, index), amount }));
}

/** Period of the last installment of the simulation. */
export function getForecastSimulationEndPeriod(simulation: ForecastSimulation) {
  return addMonthsToPeriod(simulation.firstPeriod, simulation.installmentCount - 1);
}
