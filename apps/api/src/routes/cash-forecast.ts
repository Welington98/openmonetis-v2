import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { ok } from "@openmonetis/shared/api";
import {
  CashForecastOutputSchema,
  CashForecastQuerySchema,
} from "@openmonetis/validators/cash-forecast";
import type { CashForecastService } from "../services/cash-forecast.service";
import type { ApiVariables } from "../types/context";
import { ErrorResponseSchema as ErrorSchema, validationHook } from "../utils/openapi";

const CashForecastResponseSchema = z.object({ data: CashForecastOutputSchema, error: z.null() });

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

  return route;
}
