import type { TransactionCondition } from "./transactions";

/**
 * Fixed expenses are commitments already taken (installments, recurring bills): they are reserved
 * from the budget for the whole month. Variable expenses are day-to-day decisions: only they use
 * up the daily allowance of the day they happen.
 */
export const expenseNatures = ["fixed", "variable"] as const;
export type ExpenseNature = (typeof expenseNatures)[number];

/** Upper bound of category overrides a user can keep, well above any real category list. */
export const maxExpenseCategoryNatures = 500;

export type ExpenseClassification = {
  installmentsAreFixed: boolean;
  recurringAreFixed: boolean;
  /** Category overrides, applied before the rule by condition. */
  categoryNatures: ReadonlyMap<string, ExpenseNature>;
};

export function createDefaultExpenseClassification(): ExpenseClassification {
  return { installmentsAreFixed: true, recurringAreFixed: true, categoryNatures: new Map() };
}

/**
 * Nature of an expense: the category override when there is one; otherwise installments and
 * recurring expenses are fixed (each can be turned off) and single expenses are variable.
 */
export function resolveExpenseNature(
  expense: { condition?: TransactionCondition | null; categoryId: string | null },
  classification: ExpenseClassification,
): ExpenseNature {
  const override = expense.categoryId
    ? classification.categoryNatures.get(expense.categoryId)
    : null;
  if (override) return override;
  if (expense.condition === "installment" && classification.installmentsAreFixed) return "fixed";
  if (expense.condition === "recurring" && classification.recurringAreFixed) return "fixed";
  return "variable";
}
