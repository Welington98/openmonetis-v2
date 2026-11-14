import { z } from "@hono/zod-openapi";
import { maxForecastSimulationInstallments } from "@openmonetis/domain/forecast-simulations";

const periodSchema = z.string().regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/);
const amountSchema = z.number().finite().multipleOf(0.01).positive().max(9_999_999_999.99);
const descriptionSchema = z.string().trim().min(1).max(120);
const installmentCountSchema = z.number().int().min(1).max(maxForecastSimulationInstallments);

export const CreateForecastSimulationInputSchema = z
  .object({
    description: descriptionSchema,
    amount: amountSchema,
    installmentCount: installmentCountSchema.default(1),
    firstPeriod: periodSchema,
    isActive: z.boolean().default(true),
  })
  .openapi("CreateForecastSimulationInput");

export const UpdateForecastSimulationInputSchema = z
  .object({
    description: descriptionSchema.optional(),
    amount: amountSchema.optional(),
    installmentCount: installmentCountSchema.optional(),
    firstPeriod: periodSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    "Provide at least one field to update",
  )
  .openapi("UpdateForecastSimulationInput");

export const ForecastSimulationParamsSchema = z
  .object({ id: z.uuid().openapi({ param: { name: "id", in: "path" } }) })
  .openapi("ForecastSimulationParams");

export const ForecastSimulationOutputSchema = z
  .object({
    id: z.uuid(),
    description: z.string(),
    amount: z.number().positive(),
    installmentCount: z.number().int().positive(),
    installmentAmount: z.number().positive(),
    firstPeriod: periodSchema,
    endPeriod: periodSchema,
    isActive: z.boolean(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi("ForecastSimulation");

export type CreateForecastSimulationInput = z.infer<typeof CreateForecastSimulationInputSchema>;
export type UpdateForecastSimulationInput = z.infer<typeof UpdateForecastSimulationInputSchema>;
export type ForecastSimulationOutput = z.infer<typeof ForecastSimulationOutputSchema>;
