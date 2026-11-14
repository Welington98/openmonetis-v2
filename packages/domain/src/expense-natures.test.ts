import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultExpenseClassification, resolveExpenseNature } from "./expense-natures";

test("by default single expenses are variable and installments or recurring ones are fixed", () => {
  const classification = createDefaultExpenseClassification();
  assert.equal(
    resolveExpenseNature({ condition: "single", categoryId: "food" }, classification),
    "variable",
  );
  assert.equal(
    resolveExpenseNature({ condition: "installment", categoryId: "food" }, classification),
    "fixed",
  );
  assert.equal(
    resolveExpenseNature({ condition: "recurring", categoryId: null }, classification),
    "fixed",
  );
});

test("the rule by condition can be turned off and category overrides win over it", () => {
  const classification = {
    installmentsAreFixed: false,
    recurringAreFixed: true,
    categoryNatures: new Map([
      ["housing", "fixed" as const],
      ["streaming", "variable" as const],
    ]),
  };
  assert.equal(
    resolveExpenseNature({ condition: "installment", categoryId: "food" }, classification),
    "variable",
  );
  assert.equal(
    resolveExpenseNature({ condition: "single", categoryId: "housing" }, classification),
    "fixed",
  );
  assert.equal(
    resolveExpenseNature({ condition: "recurring", categoryId: "streaming" }, classification),
    "variable",
  );
});
