/**
 * Shared four-step scale used to signal how much of an available amount is already used:
 * budgets, daily allowances and the month-by-month cash forecast all speak the same language.
 */
export const usageLevels = ["healthy", "attention", "warning", "critical"] as const;
export type UsageLevel = (typeof usageLevels)[number];

/** Usage percentage from which the amount deserves attention (yellow). */
export const usageAttentionThreshold = 70;
/** Usage percentage from which the amount is close to its limit (orange). */
export const usageWarningThreshold = 90;
/** Usage percentage above which the amount is over its limit (red). */
export const usageCriticalThreshold = 100;

/**
 * Resolves the level of a usage percentage. `null` means there is nothing available to use, so
 * any usage at all is already critical.
 */
export function resolveUsageLevel(percentage: number | null, usedAmount = 0): UsageLevel {
  if (percentage === null) return usedAmount > 0 ? "critical" : "healthy";
  if (percentage > usageCriticalThreshold) return "critical";
  if (percentage >= usageWarningThreshold) return "warning";
  if (percentage >= usageAttentionThreshold) return "attention";
  return "healthy";
}
