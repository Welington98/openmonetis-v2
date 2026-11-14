import type { ExpenseCategoryNature } from "@openmonetis/validators/expense-natures";

/** "auto" follows the rule by type of entry; the others override it for the category. */
export const categoryNatureChoices = ["auto", "fixed", "variable"] as const;
export type CategoryNatureChoice = (typeof categoryNatureChoices)[number];

export const categoryNatureChoiceLabels: Record<CategoryNatureChoice, string> = {
  auto: "Pelo tipo",
  fixed: "Sempre fixa",
  variable: "Sempre variável",
};

export function toCategoryNatureChoices(items: readonly ExpenseCategoryNature[]) {
  return Object.fromEntries(items.map((item) => [item.categoryId, item.nature])) as Record<
    string,
    CategoryNatureChoice
  >;
}

export function toCategoryNatureItems(
  choices: Readonly<Record<string, CategoryNatureChoice>>,
): ExpenseCategoryNature[] {
  return Object.entries(choices).flatMap(([categoryId, choice]) =>
    choice === "auto" ? [] : [{ categoryId, nature: choice }],
  );
}
