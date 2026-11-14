import { formatDateInBrazil, periodToSafeInstant } from "@openmonetis/shared/date-time";
import type { BudgetOutput } from "@openmonetis/validators/budgets";

export const budgetLevelLabels: Record<BudgetOutput["level"], string> = {
  healthy: "Dentro do limite",
  attention: "Atenção",
  warning: "Quase no limite",
  critical: "Limite excedido",
};

/** Badge label: the level, except for a budget used to the cent, which is called out as such. */
export function getBudgetLevelLabel(budget: Pick<BudgetOutput, "level" | "status">) {
  return budget.status === "reached" ? "Limite atingido" : budgetLevelLabels[budget.level];
}

export function formatDailyAllowanceDays(daysRemaining: number) {
  return daysRemaining === 1 ? "último dia do mês" : `${daysRemaining} dias restantes`;
}

export function formatBudgetPercentage(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
}

export function formatBudgetAttention(count: number) {
  return count === 1
    ? "1 categoria está perto ou acima do limite."
    : `${count} categorias estão perto ou acima do limite.`;
}

export function formatBudgetCategoryCount(count: number) {
  return count === 1 ? "1 categoria com limite" : `${count} categorias com limite`;
}

export function formatBudgetPeriod(period: string) {
  const label = formatDateInBrazil(periodToSafeInstant(period), {
    month: "long",
    year: "numeric",
  });
  return `${label.charAt(0).toLocaleUpperCase("pt-BR")}${label.slice(1)}`;
}

export function getBudgetWidgetItems(items: BudgetOutput[], limit?: number) {
  const sorted = [...items].sort(
    (left, right) =>
      right.usagePercentage - left.usagePercentage ||
      right.committedAmount - left.committedAmount ||
      left.categoryName.localeCompare(right.categoryName, "pt-BR"),
  );

  return limit === undefined ? sorted : sorted.slice(0, limit);
}
