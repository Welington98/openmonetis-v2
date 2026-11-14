import assert from "node:assert/strict";
import test from "node:test";
import {
  createForecastSimulationsService,
  type ForecastSimulationRecord,
  type ForecastSimulationsRepository,
} from "./forecast-simulations.service";

function fixture() {
  const rows: ForecastSimulationRecord[] = [];
  const repository: ForecastSimulationsRepository = {
    async listForUser(userId) {
      return rows.filter((row) => row.userId === userId);
    },
    async countForUser(userId) {
      return rows.filter((row) => row.userId === userId).length;
    },
    async insert(data) {
      const row = {
        ...data,
        id: `simulation-${rows.length}`,
        createdAt: new Date("2026-11-14T12:00:00Z"),
        updatedAt: new Date("2026-11-14T12:00:00Z"),
      };
      rows.push(row);
      return row;
    },
    async updateForUser(id, userId, data) {
      const row = rows.find((item) => item.id === id && item.userId === userId);
      if (!row) return null;
      Object.assign(row, data);
      return row;
    },
    async deleteForUser(id, userId) {
      const index = rows.findIndex((item) => item.id === id && item.userId === userId);
      return index < 0 ? null : (rows.splice(index, 1)[0] ?? null);
    },
  };
  return { rows, service: createForecastSimulationsService(repository) };
}

test("simulations report their installment schedule without exposing the owner", async () => {
  const f = fixture();
  const created = await f.service.create(
    {
      description: " Notebook ",
      amount: 3_000,
      installmentCount: 12,
      firstPeriod: "2026-12",
      isActive: true,
    },
    "owner",
  );
  assert.equal(created.description, "Notebook");
  assert.equal(created.installmentAmount, 250);
  assert.equal(created.endPeriod, "2027-11");
  assert.equal("userId" in created, false);
});

test("only active simulations feed the forecast and toggling keeps the draft", async () => {
  const f = fixture();
  const kept = await f.service.create(
    {
      description: "Viagem",
      amount: 900,
      installmentCount: 3,
      firstPeriod: "2027-01",
      isActive: true,
    },
    "owner",
  );
  await f.service.create(
    {
      description: "Sofá",
      amount: 2_000,
      installmentCount: 1,
      firstPeriod: "2026-12",
      isActive: true,
    },
    "owner",
  );
  const paused = (await f.service.list("owner")).find((item) => item.description === "Sofá");
  assert.ok(paused);
  await f.service.update(paused.id, "owner", { isActive: false });
  assert.deepEqual(await f.service.listActive("owner"), [
    { label: "Viagem", amount: "900.00", installmentCount: 3, firstPeriod: "2027-01" },
  ]);
  assert.equal((await f.service.list("owner")).length, 2);
  assert.equal(kept.isActive, true);
});

test("simulations of another user cannot be changed or removed", async () => {
  const f = fixture();
  const simulation = await f.service.create(
    { description: "TV", amount: 100, installmentCount: 1, firstPeriod: "2026-12", isActive: true },
    "owner",
  );
  await assert.rejects(f.service.update(simulation.id, "intruder", { amount: 1 }), {
    code: "forecast_simulation_not_found",
  });
  await assert.rejects(f.service.remove(simulation.id, "intruder"), {
    code: "forecast_simulation_not_found",
  });
  assert.equal(f.rows[0]?.amount, "100.00");
});
