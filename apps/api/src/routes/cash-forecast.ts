import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { ok } from "@openmonetis/shared/api";
import {
  CashForecastOutputSchema,
  CashForecastQuerySchema,
  DailyCashForecastOutputSchema,
  DailyCashForecastQuerySchema,
} from "@openmonetis/validators/cash-forecast";
import type { CashForecastService } from "../services/cash-forecast.service";
import type { ApiVariables } from "../types/context";
import { ErrorResponseSchema as ErrorSchema, validationHook } from "../utils/openapi";

const CashForecastResponseSchema = z.object({ data: CashForecastOutputSchema, error: z.null() });
const DailyCashForecastResponseSchema = z.object({
  data: DailyCashForecastOutputSchema,
  error: z.null(),
});

export function createCashForecastRoute(service: CashForecastService) {
  const route = new OpenAPIHono<{ Variables: ApiVariables }>({ defaultHook: validationHook });

  route.openapi(
    createRoute({
      method: "get",
      path: "/",
      tags: ["Reports"],
      request: { query: CashForecastQuerySchema },
      responses: {
        200: {
          description:
            "Month-by-month balance forecast from commitments, unspent budgets and active simulations",
          content: { "application/json": { schema: CashForecastResponseSchema } },
        },
        400: {
          description: "Invalid forecast period",
          content: { "application/json": { schema: ErrorSchema } },
        },
        401: {
          description: "Authentication required",
          content: { "application/json": { schema: ErrorSchema } },
        },
      },
    }),
    async (context) =>
      context.json(ok(await service.get(context.get("userId"), context.req.valid("query"))), 200),
  );

  route.openapi(
    createRoute({
      method: "get",
      path: "/daily",
      tags: ["Reports"],
      request: { query: DailyCashForecastQuerySchema },
      responses: {
        200: {
          description:
            "Balance at the end of each day of a month, from the current month on, with the events of each day",
          content: { "application/json": { schema: DailyCashForecastResponseSchema } },
        },
        400: {
          description: "Period before the current month or too far ahead",
          content: { "application/json": { schema: ErrorSchema } },
        },
        401: {
          description: "Authentication required",
          content: { "application/json": { schema: ErrorSchema } },
        },
      },
    }),
    async (context) =>
      context.json(
        ok(await service.getDaily(context.get("userId"), context.req.valid("query"))),
        200,
      ),
  );

  return route;
}
