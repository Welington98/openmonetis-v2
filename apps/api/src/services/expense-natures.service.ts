import type { ExpenseClassification, ExpenseNature } from "@openmonetis/domain/expense-natures";
import type {
  ExpenseCategoryNaturesOutput,
  ReplaceExpenseCategoryNaturesInput,
} from "@openmonetis/validators/expense-natures";
import { badRequest } from "../utils/errors";

export type ExpenseCategoryNatureRecord = { categoryId: string; nature: ExpenseNature };

export type ExpenseNaturesRepository = {
  listForUser(userId: string): Promise<ExpenseCategoryNatureRecord[]>;
  listExpenseCategoryIds(userId: string): Promise<string[]>;
  replaceForUser(userId: string, items: ExpenseCategoryNatureRecord[]): Promise<void>;
};

type ExpenseNaturePreferencesReader = {
  get(userId: string): Promise<{ installmentsAreFixed: boolean; recurringAreFixed: boolean }>;
};

export function createExpenseNaturesService(
  repository: ExpenseNaturesRepository,
  preferences: ExpenseNaturePreferencesReader,
) {
  async function list(userId: string): Promise<ExpenseCategoryNaturesOutput> {
    return { items: await repository.listForUser(userId) };
  }

  return {
    list,

    /** Replaces every category override at once, as the settings screen saves them together. */
    async replace(
      userId: string,
      input: ReplaceExpenseCategoryNaturesInput,
    ): Promise<ExpenseCategoryNaturesOutput> {
      const ownCategoryIds = new Set(await repository.listExpenseCategoryIds(userId));
      if (input.items.some((item) => !ownCategoryIds.has(item.categoryId))) {
        throw badRequest(
          "One or more expense categories are invalid",
          "invalid_expense_categories",
        );
      }
      await repository.replaceForUser(userId, input.items);
      return list(userId);
    },

    /** Rule by condition from the preferences plus the category overrides. */
    async getClassification(userId: string): Promise<ExpenseClassification> {
      const [rule, overrides] = await Promise.all([
        preferences.get(userId),
        repository.listForUser(userId),
      ]);
      return {
        installmentsAreFixed: rule.installmentsAreFixed,
        recurringAreFixed: rule.recurringAreFixed,
        categoryNatures: new Map(overrides.map((item) => [item.categoryId, item.nature])),
      };
    },
  };
}

export type ExpenseNaturesService = ReturnType<typeof createExpenseNaturesService>;
