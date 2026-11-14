import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { ok } from "@openmonetis/shared/api";
import {
  CreateForecastSimulationInputSchema,
  ForecastSimulationOutputSchema,
  ForecastSimulationParamsSchema,
  UpdateForecastSimulationInputSchema,
} from "@openmonetis/validators/forecast-simulations";
import type { ForecastSimulationsService } from "../services/forecast-simulations.service";
import type { ApiVariables } from "../types/context";
import { ErrorResponseSchema as ErrorSchema, validationHook } from "../utils/openapi";

const SimulationResponseSchema = z.object({
  data: ForecastSimulationOutputSchema,
  error: z.null(),
});
const SimulationListResponseSchema = z.object({
  data: z.array(ForecastSimulationOutputSchema),
  error: z.null(),
});
const DeleteResponseSchema = z.object({ data: z.object({ id: z.uuid() }), error: z.null() });
const unauthorized = {
  description: "Authentication required",
  content: { "application/json": { schema: ErrorSchema } },
};
const simulationNotFound = {
  description: "Simulation not found",
  content: { "application/json": { schema: ErrorSchema } },
};

export function createForecastSimulationsRoute(service: ForecastSimulationsService) {
  const route = new OpenAPIHono<{ Variables: ApiVariables }>({ defaultHook: validationHook });

  route.openapi(
    createRoute({
      method: "get",
      path: "/",
      tags: ["Forecast simulations"],
      responses: {
        200: {
          description: "Saved purchase simulations",
          content: { "application/json": { schema: SimulationListResponseSchema } },
        },
        401: unauthorized,
      },
    }),
    async (context) => context.json(ok(await service.list(context.get("userId"))), 200),
  );

  route.openapi(
    createRoute({
      method: "post",
      path: "/",
      tags: ["Forecast simulations"],
      request: {
        body: {
          required: true,
          content: { "application/json": { schema: CreateForecastSimulationInputSchema } },
        },
      },
      responses: {
        201: {
          description: "Saved simulation",
          content: { "application/json": { schema: SimulationResponseSchema } },
        },
        400: {
          description: "Invalid simulation or limit reached",
          content: { "application/json": { schema: ErrorSchema } },
        },
        401: unauthorized,
      },
    }),
    async (context) =>
      context.json(ok(await service.create(context.req.valid("json"), context.get("userId"))), 201),
  );

  route.openapi(
    createRoute({
      method: "patch",
      path: "/{id}",
      tags: ["Forecast simulations"],
      request: {
        params: ForecastSimulationParamsSchema,
        body: {
          required: true,
          content: { "application/json": { schema: UpdateForecastSimulationInputSchema } },
        },
      },
      responses: {
        200: {
          description: "Updated simulation",
          content: { "application/json": { schema: SimulationResponseSchema } },
        },
        400: {
          description: "Invalid request",
          content: { "application/json": { schema: ErrorSchema } },
        },
        401: unauthorized,
        404: simulationNotFound,
      },
    }),
    async (context) => {
      const { id } = context.req.valid("param");
      return context.json(
        ok(await service.update(id, context.get("userId"), context.req.valid("json"))),
        200,
      );
    },
  );

  route.openapi(
    createRoute({
      method: "delete",
      path: "/{id}",
      tags: ["Forecast simulations"],
      request: { params: ForecastSimulationParamsSchema },
      responses: {
        200: {
          description: "Deleted simulation",
          content: { "application/json": { schema: DeleteResponseSchema } },
        },
        401: unauthorized,
        404: simulationNotFound,
      },
    }),
    async (context) => {
      const { id } = context.req.valid("param");
      return context.json(ok(await service.remove(id, context.get("userId"))), 200);
    },
  );

  return route;
}
