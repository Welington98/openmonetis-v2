import { z } from "@hono/zod-openapi";
import {
  cashEventKinds,
  cashForecastDayStatuses,
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

export const DailyCashForecastQuerySchema = z
  .object({
    period: periodSchema.openapi({ param: { name: "period", in: "query" }, example: "2026-11" }),
  })
  .openapi("DailyCashForecastQuery");

export const CashEventOutputSchema = z
  .object({
    date: z.iso.date(),
    amount: z.number(),
    kind: z.enum(cashEventKinds),
    label: z.string(),
  })
  .openapi("CashEvent");

export const CashForecastDayOutputSchema = z
  .object({
    date: z.iso.date(),
    status: z.enum(cashForecastDayStatuses),
    dailyAmount: z.number().nonnegative().nullable(),
    incomeAmount: z.number().nonnegative(),
    expenseAmount: z.number().nonnegative(),
    simulationAmount: z.number().nonnegative(),
    closingBalance: z.number(),
    level: z.enum(usageLevels),
    events: z.array(CashEventOutputSchema),
  })
  .openapi("CashForecastDay");

export const DailyCashForecastOutputSchema = z
  .object({
    period: periodSchema,
    today: z.iso.date(),
    openingBalance: z.number(),
    minimumBalance: z.number().nonnegative(),
    minimumBalanceSource: z.enum(["automatic", "custom"]),
    budgetEstimated: z.boolean(),
    days: z.array(CashForecastDayOutputSchema),
    lowestBalance: z.object({ date: z.iso.date(), amount: z.number() }).nullable(),
    firstNegativeDate: z.iso.date().nullable(),
  })
  .openapi("DailyCashForecast");

export type DailyCashForecastQuery = z.infer<typeof DailyCashForecastQuerySchema>;
export type CashForecastDayOutput = z.infer<typeof CashForecastDayOutputSchema>;
export type DailyCashForecastOutput = z.infer<typeof DailyCashForecastOutputSchema>;
