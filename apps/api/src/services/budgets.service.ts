import {
  type BudgetCreateDraft,
  type BudgetDailyAllowance,
  type BudgetRecurringRule,
  type BudgetSpendingEntry,
  calculateBudgetOverview,
  type calculateBudgetProgress,
  calculateBudgetSpending,
  createBudgetDraft,
  getPreviousBudgetPeriod,
} from "@openmonetis/domain/budgets";
import type { CashForecastBudgetReserve } from "@openmonetis/domain/cash-forecast";
import { getPeriodEndDate } from "@openmonetis/domain/transactions";
import { getCurrentDateInBrazil } from "@openmonetis/shared/date-time";
import type {
  BudgetOutput,
  CopyPreviousBudgetsInput,
  CreateBudgetInput,
  ListBudgetsQuery,
  UpdateBudgetInput,
} from "@openmonetis/validators/budgets";
import { badRequest, notFound } from "../utils/errors";

type BudgetRecord = {
  id: string;
  userId: string;
  categoryId: string;
  period: string;
  amount: string;
  createdAt: Date;
  updatedAt: Date;
};

type BudgetWithCategoryRecord = BudgetRecord & {
  categoryName: string;
  categoryIcon: string | null;
};

type BudgetUpdateRecord = { amount?: string; period?: string };

export type BudgetsRepository = {
  insertIfAbsent(data: BudgetCreateDraft): Promise<BudgetRecord | null>;
  listByUserAndPeriod(userId: string, period: string): Promise<BudgetWithCategoryRecord[]>;
  /** Latest period before `period` that has at least one budget, or `null`. */
  findLatestPeriodBefore(userId: string, period: string): Promise<string | null>;
  findByIdForUser(id: string, userId: string): Promise<BudgetWithCategoryRecord | null>;
  findByCategoryAndPeriodForUser(
    categoryId: string,
    period: string,
    userId: string,
  ): Promise<BudgetRecord | null>;
  updateForUser(id: string, userId: string, data: BudgetUpdateRecord): Promise<BudgetRecord | null>;
  deleteForUser(id: string, userId: string): Promise<BudgetRecord | null>;
  listSpendingEntries(userId: string, period: string): Promise<BudgetSpendingEntry[]>;
  listRecurringRules(userId: string, periodEnd: Date): Promise<BudgetRecurringRule[]>;
  insertCopies(data: BudgetCreateDraft[]): Promise<BudgetRecord[]>;
};

type BudgetCategoriesRepository = {
  findByIdForUser(
    id: string,
    userId: string,
  ): Promise<{ id: string; type: "income" | "expense" } | null>;
};

export function createBudgetsService(
  repository: BudgetsRepository,
  categoriesRepository: BudgetCategoriesRepository,
  today: () => string = getCurrentDateInBrazil,
) {
  async function expenseCategory(categoryId: string, userId: string) {
    const category = await categoriesRepository.findByIdForUser(categoryId, userId);
    if (category?.type !== "expense") {
      throw notFound("Expense category not found", "expense_category_not_found");
    }
    return category;
  }

  async function calculateOverview(
    userId: string,
    period: string,
    budgetRows: Array<{ categoryId: string; amount: string }>,
  ) {
    const [spendingEntries, recurringRules] = await Promise.all([
      repository.listSpendingEntries(userId, period),
      repository.listRecurringRules(userId, getPeriodEndDate(period)),
    ]);
    const referenceDay = today();
    const spending = calculateBudgetSpending(spendingEntries, recurringRules, period, referenceDay);
    return calculateBudgetOverview(budgetRows, spending, { period, today: referenceDay });
  }

  async function list(userId: string, query: ListBudgetsQuery) {
    const budgetRows = await repository.listByUserAndPeriod(userId, query.period);
    const overview = await calculateOverview(userId, query.period, budgetRows);
    const items = budgetRows
      .map((budget) =>
        toOutput(
          budget,
          overview.progressByCategory.get(budget.categoryId) as ReturnType<
            typeof calculateBudgetProgress
          >,
          overview.dailyByCategory.get(budget.categoryId) ?? null,
        ),
      )
      .sort((left, right) => left.categoryName.localeCompare(right.categoryName, "pt-BR"));

    return {
      period: query.period,
      allocatedAmount: overview.allocatedAmount,
      actualSpentAmount: overview.actualSpentAmount,
      projectedAmount: overview.projectedAmount,
      committedAmount: overview.committedAmount,
      availableAmount: overview.availableAmount,
      exceededAmount: overview.exceededAmount,
      usagePercentage: overview.usagePercentage,
      unbudgetedCommittedAmount: overview.unbudgetedCommittedAmount,
      unbudgetedItems: overview.unbudgetedItems,
      warningCount: overview.warningCount,
      level: overview.level,
      daily: overview.daily,
      items,
    };
  }

  /**
   * Budget money still expected to be spent in a period. Periods without budgets inherit the
   * limits of the latest earlier period with budgets, so the forecast is not blind to variable
   * spending in months nobody planned yet.
   */
  async function projectReserve(
    userId: string,
    period: string,
  ): Promise<CashForecastBudgetReserve> {
    let budgetRows = await repository.listByUserAndPeriod(userId, period);
    let estimated = false;
    if (budgetRows.length === 0) {
      const latestPeriod = await repository.findLatestPeriodBefore(userId, period);
      if (!latestPeriod) return { period, amount: 0, estimated: false };
      budgetRows = await repository.listByUserAndPeriod(userId, latestPeriod);
      estimated = budgetRows.length > 0;
    }
    if (budgetRows.length === 0) return { period, amount: 0, estimated: false };
    const overview = await calculateOverview(userId, period, budgetRows);
    return { period, amount: overview.availableAmount, estimated };
  }

  return {
    list,
    projectReserve,

    async get(id: string, userId: string) {
      const budget = await repository.findByIdForUser(id, userId);
      if (!budget) throw notFound("Budget not found", "budget_not_found");
      const overview = await list(userId, { period: budget.period });
      const output = overview.items.find((item) => item.id === id);
      if (!output) throw notFound("Budget not found", "budget_not_found");
      return output;
    },

    async create(input: CreateBudgetInput, userId: string) {
      await expenseCategory(input.categoryId, userId);
      const budget = await repository.insertIfAbsent(
        createBudgetDraft({
          userId,
          categoryId: input.categoryId,
          period: input.period,
          amount: input.amount,
        }),
      );
      if (!budget) {
        throw badRequest(
          "A budget already exists for this category and period",
          "budget_already_exists",
        );
      }
      const output = (await list(userId, { period: input.period })).items.find(
        (item) => item.id === budget.id,
      );
      if (!output) throw notFound("Budget not found", "budget_not_found");
      return output;
    },

    async update(id: string, userId: string, input: UpdateBudgetInput) {
      const current = await repository.findByIdForUser(id, userId);
      if (!current) throw notFound("Budget not found", "budget_not_found");
      const targetPeriod = input.period ?? current.period;
      if (targetPeriod !== current.period) {
        const existing = await repository.findByCategoryAndPeriodForUser(
          current.categoryId,
          targetPeriod,
          userId,
        );
        if (existing) {
          throw badRequest(
            "A budget already exists for this category and period",
            "budget_already_exists",
          );
        }
      }
      const values: BudgetUpdateRecord = {};
      if (input.amount !== undefined) values.amount = input.amount.toFixed(2);
      if (input.period !== undefined) values.period = input.period;
      const budget = await repository.updateForUser(id, userId, values);
      if (!budget) throw notFound("Budget not found", "budget_not_found");
      const output = (await list(userId, { period: targetPeriod })).items.find(
        (item) => item.id === id,
      );
      if (!output) throw notFound("Budget not found", "budget_not_found");
      return output;
    },

    async remove(id: string, userId: string) {
      const budget = await repository.deleteForUser(id, userId);
      if (!budget) throw notFound("Budget not found", "budget_not_found");
      return { id: budget.id };
    },

    async copyPrevious(input: CopyPreviousBudgetsInput, userId: string) {
      const previousBudgets = await repository.listByUserAndPeriod(
        userId,
        getPreviousBudgetPeriod(input.period),
      );
      const selectedIds = new Set(input.sourceBudgetIds);
      const selectedBudgets = previousBudgets.filter((budget) => selectedIds.has(budget.id));
      if (selectedBudgets.length !== selectedIds.size) {
        throw badRequest("One or more source budgets are invalid", "invalid_source_budgets");
      }
      const drafts = selectedBudgets.map((budget) => ({
        userId,
        categoryId: budget.categoryId,
        period: input.period,
        amount: budget.amount,
      }));

      const createdCount = (await repository.insertCopies(drafts)).length;
      return { createdCount, skippedCount: selectedBudgets.length - createdCount };
    },
  };
}

function toOutput(
  budget: BudgetWithCategoryRecord,
  progress: ReturnType<typeof calculateBudgetProgress>,
  daily: BudgetDailyAllowance | null,
): BudgetOutput {
  return {
    id: budget.id,
    categoryId: budget.categoryId,
    categoryName: budget.categoryName,
    categoryIcon: budget.categoryIcon,
    period: budget.period,
    amount: Math.abs(Number(budget.amount)),
    ...progress,
    daily,
    createdAt: budget.createdAt.toISOString(),
    updatedAt: budget.updatedAt.toISOString(),
  };
}

export type BudgetsService = ReturnType<typeof createBudgetsService>;
