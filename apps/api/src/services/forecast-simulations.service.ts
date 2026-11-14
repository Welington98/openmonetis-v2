import {
  createForecastSimulationDraft,
  expandForecastSimulation,
  type ForecastSimulationDraft,
  getForecastSimulationEndPeriod,
  maxForecastSimulationsPerUser,
} from "@openmonetis/domain/forecast-simulations";
import type {
  CreateForecastSimulationInput,
  ForecastSimulationOutput,
  UpdateForecastSimulationInput,
} from "@openmonetis/validators/forecast-simulations";
import { badRequest, notFound } from "../utils/errors";

export type ForecastSimulationRecord = {
  id: string;
  userId: string;
  description: string;
  amount: string;
  installmentCount: number;
  firstPeriod: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ForecastSimulationUpdateRecord = Partial<
  Pick<
    ForecastSimulationRecord,
    "description" | "amount" | "installmentCount" | "firstPeriod" | "isActive"
  >
>;

export type ForecastSimulationsRepository = {
  listForUser(userId: string): Promise<ForecastSimulationRecord[]>;
  countForUser(userId: string): Promise<number>;
  insert(data: ForecastSimulationDraft): Promise<ForecastSimulationRecord>;
  updateForUser(
    id: string,
    userId: string,
    data: ForecastSimulationUpdateRecord,
  ): Promise<ForecastSimulationRecord | null>;
  deleteForUser(id: string, userId: string): Promise<ForecastSimulationRecord | null>;
};

export function createForecastSimulationsService(repository: ForecastSimulationsRepository) {
  return {
    async list(userId: string): Promise<ForecastSimulationOutput[]> {
      return (await repository.listForUser(userId)).map(toOutput);
    },

    /** Active simulations as plain amounts, for the cash forecast. */
    async listActive(userId: string) {
      return (await repository.listForUser(userId))
        .filter((simulation) => simulation.isActive)
        .map(({ amount, installmentCount, firstPeriod }) => ({
          amount,
          installmentCount,
          firstPeriod,
        }));
    },

    async create(input: CreateForecastSimulationInput, userId: string) {
      if ((await repository.countForUser(userId)) >= maxForecastSimulationsPerUser) {
        throw badRequest("Too many saved simulations", "forecast_simulation_limit_reached");
      }
      return toOutput(await repository.insert(createForecastSimulationDraft({ ...input, userId })));
    },

    async update(id: string, userId: string, input: UpdateForecastSimulationInput) {
      const values: ForecastSimulationUpdateRecord = {};
      if (input.description !== undefined) values.description = input.description.trim();
      if (input.amount !== undefined) values.amount = input.amount.toFixed(2);
      if (input.installmentCount !== undefined) values.installmentCount = input.installmentCount;
      if (input.firstPeriod !== undefined) values.firstPeriod = input.firstPeriod;
      if (input.isActive !== undefined) values.isActive = input.isActive;
      const simulation = await repository.updateForUser(id, userId, values);
      if (!simulation) throw notFound("Simulation not found", "forecast_simulation_not_found");
      return toOutput(simulation);
    },

    async remove(id: string, userId: string) {
      const simulation = await repository.deleteForUser(id, userId);
      if (!simulation) throw notFound("Simulation not found", "forecast_simulation_not_found");
      return { id: simulation.id };
    },
  };
}

function toOutput(simulation: ForecastSimulationRecord): ForecastSimulationOutput {
  const [first] = expandForecastSimulation(simulation);
  return {
    id: simulation.id,
    description: simulation.description,
    amount: Math.abs(Number(simulation.amount)),
    installmentCount: simulation.installmentCount,
    installmentAmount: first?.amount ?? 0,
    firstPeriod: simulation.firstPeriod,
    endPeriod: getForecastSimulationEndPeriod(simulation),
    isActive: simulation.isActive,
    createdAt: simulation.createdAt.toISOString(),
    updatedAt: simulation.updatedAt.toISOString(),
  };
}

export type ForecastSimulationsService = ReturnType<typeof createForecastSimulationsService>;
