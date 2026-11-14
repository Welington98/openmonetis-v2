import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refreshFinancialQueries } from "@/lib/financial-query-invalidation";
import { replaceExpenseCategoryNatures } from "./expense-natures.api";

/** Changing what is fixed changes every daily allowance and the daily forecast. */
export function useReplaceExpenseCategoryNaturesMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: replaceExpenseCategoryNatures,
    onSuccess: () => refreshFinancialQueries(client),
  });
}
