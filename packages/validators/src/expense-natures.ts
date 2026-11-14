import { z } from "@hono/zod-openapi";
import { expenseNatures, maxExpenseCategoryNatures } from "@openmonetis/domain/expense-natures";

export { expenseNatures } from "@openmonetis/domain/expense-natures";

export const ExpenseCategoryNatureSchema = z
  .object({ categoryId: z.uuid(), nature: z.enum(expenseNatures) })
  .openapi("ExpenseCategoryNature");

export const ReplaceExpenseCategoryNaturesInputSchema = z
  .object({
    items: z
      .array(ExpenseCategoryNatureSchema)
      .max(maxExpenseCategoryNatures)
      .refine(
        (items) => new Set(items.map((item) => item.categoryId)).size === items.length,
        "Each category can appear only once",
      ),
  })
  .openapi("ReplaceExpenseCategoryNaturesInput");

export const ExpenseCategoryNaturesOutputSchema = z
  .object({ items: z.array(ExpenseCategoryNatureSchema) })
  .openapi("ExpenseCategoryNatures");

export type ExpenseCategoryNature = z.infer<typeof ExpenseCategoryNatureSchema>;
export type ReplaceExpenseCategoryNaturesInput = z.infer<
  typeof ReplaceExpenseCategoryNaturesInputSchema
>;
export type ExpenseCategoryNaturesOutput = z.infer<typeof ExpenseCategoryNaturesOutputSchema>;
