import { z } from "@hono/zod-openapi";
import {
  defaultCashForecastMonths,
  maxCashForecastMonths,
} from "@openmonetis/domain/cash-forecast";
import { usageLevels } from "@openmonetis/domain/usage-levels";

const periodSchema = z.string().regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/);

export const CashForecastQuerySchema = z
  .object({
    startPeriod: periodSchema.openapi({
      param: { name: "startPeriod", in: "query" },
      example: "2026-11",
    }),
    months: z.coerce
      .number()
      .int()
      .min(1)
      .max(maxCashForecastMonths)
      .default(defaultCashForecastMonths)
      .openapi({ param: { name: "months", in: "query" }, example: defaultCashForecastMonths }),
  })
  .openapi("CashForecastQuery");

export const CashForecastMonthOutputSchema = z
  .object({
    period: periodSchema,
    openingBalance: z.number(),
    incomeAmount: z.number().nonnegative(),
    committedAmount: z.number().nonnegative(),
    budgetReserveAmount: z.number().nonnegative(),
    budgetReserveEstimated: z.boolean(),
    simulationAmount: z.number().nonnegative(),
    outflowAmount: z.number().nonnegative(),
    netAmount: z.number(),
    closingBalance: z.number(),
    baselineClosingBalance: z.number(),
    usagePercentage: z.number().nonnegative().nullable(),
    level: z.enum(usageLevels),
  })
  .openapi("CashForecastMonth");

export const CashForecastOutputSchema = z
  .object({
    startPeriod: periodSchema,
    openingBalance: z.number(),
    months: z.array(CashForecastMonthOutputSchema),
    lowestBalance: z.object({ period: periodSchema, amount: z.number() }).nullable(),
    firstNegativePeriod: periodSchema.nullable(),
    simulationsAmount: z.number().nonnegative(),
  })
  .openapi("CashForecast");

export type CashForecastQuery = z.infer<typeof CashForecastQuerySchema>;
export type CashForecastMonthOutput = z.infer<typeof CashForecastMonthOutputSchema>;
export type CashForecastOutput = z.infer<typeof CashForecastOutputSchema>;
