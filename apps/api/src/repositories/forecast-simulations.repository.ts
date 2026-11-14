import { db, forecastSimulations } from "@openmonetis/db";
import { and, asc, count, eq } from "drizzle-orm";
import type { ForecastSimulationsRepository } from "../services/forecast-simulations.service";

export const forecastSimulationsRepository = {
  listForUser(userId) {
    return db
      .select()
      .from(forecastSimulations)
      .where(eq(forecastSimulations.userId, userId))
      .orderBy(asc(forecastSimulations.firstPeriod), asc(forecastSimulations.createdAt));
  },

  async countForUser(userId) {
    const [row] = await db
      .select({ total: count() })
      .from(forecastSimulations)
      .where(eq(forecastSimulations.userId, userId));
    return row?.total ?? 0;
  },

  async insert(data) {
    const [simulation] = await db.insert(forecastSimulations).values(data).returning();
    if (!simulation) throw new Error("Failed to insert forecast simulation");
    return simulation;
  },

  async updateForUser(id, userId, data) {
    const [simulation] = await db
      .update(forecastSimulations)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(forecastSimulations.id, id), eq(forecastSimulations.userId, userId)))
      .returning();
    return simulation ?? null;
  },

  async deleteForUser(id, userId) {
    const [simulation] = await db
      .delete(forecastSimulations)
      .where(and(eq(forecastSimulations.id, id), eq(forecastSimulations.userId, userId)))
      .returning();
    return simulation ?? null;
  },
} satisfies ForecastSimulationsRepository;
