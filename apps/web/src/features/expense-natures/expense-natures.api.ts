import type {
  ExpenseCategoryNaturesOutput,
  ReplaceExpenseCategoryNaturesInput,
} from "@openmonetis/validators/expense-natures";
import { requestApiWithResponseMessage as request } from "@/lib/api-client";

export function getExpenseCategoryNatures() {
  return request<ExpenseCategoryNaturesOutput>("/expense-natures");
}

export function replaceExpenseCategoryNatures(input: ReplaceExpenseCategoryNaturesInput) {
  return request<ExpenseCategoryNaturesOutput>("/expense-natures", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
