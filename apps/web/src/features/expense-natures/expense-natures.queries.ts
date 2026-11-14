import { queryOptions } from "@tanstack/react-query";
import { getExpenseCategoryNatures } from "./expense-natures.api";

export const expenseNatureKeys = { all: ["expense-natures"] as const };

export function expenseCategoryNaturesQueryOptions() {
  return queryOptions({ queryKey: expenseNatureKeys.all, queryFn: getExpenseCategoryNatures });
}
