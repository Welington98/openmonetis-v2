import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { ok } from "@openmonetis/shared/api";
import {
  ExpenseCategoryNaturesOutputSchema,
  ReplaceExpenseCategoryNaturesInputSchema,
} from "@openmonetis/validators/expense-natures";
import type { ExpenseNaturesService } from "../services/expense-natures.service";
import type { ApiVariables } from "../types/context";
import { ErrorResponseSchema as ErrorSchema, validationHook } from "../utils/openapi";

const NaturesResponseSchema = z.object({
  data: ExpenseCategoryNaturesOutputSchema,
  error: z.null(),
});
const unauthorized = {
  description: "Authentication required",
  content: { "application/json": { schema: ErrorSchema } },
};

export function createExpenseNaturesRoute(service: ExpenseNaturesService) {
  const route = new OpenAPIHono<{ Variables: ApiVariables }>({ defaultHook: validationHook });

  route.openapi(
    createRoute({
      method: "get",
      path: "/",
      tags: ["Expense natures"],
      responses: {
        200: {
          description: "Categories whose expenses are always fixed or always variable",
          content: { "application/json": { schema: NaturesResponseSchema } },
        },
        401: unauthorized,
      },
    }),
    async (context) => context.json(ok(await service.list(context.get("userId"))), 200),
  );

  route.openapi(
    createRoute({
      method: "put",
      path: "/",
      tags: ["Expense natures"],
      request: {
        body: {
          required: true,
          content: { "application/json": { schema: ReplaceExpenseCategoryNaturesInputSchema } },
        },
      },
      responses: {
        200: {
          description: "Saved category overrides",
          content: { "application/json": { schema: NaturesResponseSchema } },
        },
        400: {
          description: "Invalid or foreign categories",
          content: { "application/json": { schema: ErrorSchema } },
        },
        401: unauthorized,
      },
    }),
    async (context) =>
      context.json(
        ok(await service.replace(context.get("userId"), context.req.valid("json"))),
        200,
      ),
  );

  return route;
}
