import assert from "node:assert/strict";
import test from "node:test";
import {
  createExpenseNaturesService,
  type ExpenseCategoryNatureRecord,
} from "./expense-natures.service";

function fixture() {
  const saved = new Map<string, ExpenseCategoryNatureRecord[]>();
  const service = createExpenseNaturesService(
    {
      async listForUser(userId) {
        return saved.get(userId) ?? [];
      },
      async listExpenseCategoryIds(userId) {
        return userId === "owner" ? ["housing", "food"] : ["other"];
      },
      async replaceForUser(userId, items) {
        saved.set(userId, items);
      },
    },
    { get: async () => ({ installmentsAreFixed: false, recurringAreFixed: true }) },
  );
  return { saved, service };
}

test("category overrides replace the previous ones and feed the classification", async () => {
  const { service } = fixture();
  await service.replace("owner", { items: [{ categoryId: "food", nature: "variable" }] });
  const result = await service.replace("owner", {
    items: [{ categoryId: "housing", nature: "fixed" }],
  });
  assert.deepEqual(result.items, [{ categoryId: "housing", nature: "fixed" }]);

  const classification = await service.getClassification("owner");
  assert.equal(classification.installmentsAreFixed, false);
  assert.equal(classification.recurringAreFixed, true);
  assert.deepEqual([...classification.categoryNatures], [["housing", "fixed"]]);
});

test("categories of another user or of income are refused before saving", async () => {
  const { saved, service } = fixture();
  await assert.rejects(
    service.replace("owner", { items: [{ categoryId: "other", nature: "fixed" }] }),
    { code: "invalid_expense_categories" },
  );
  assert.equal(saved.size, 0);
});
