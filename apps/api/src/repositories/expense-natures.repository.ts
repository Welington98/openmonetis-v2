import { categories, db, expenseCategoryNatures } from "@openmonetis/db";
import { and, asc, eq } from "drizzle-orm";
import type { ExpenseNaturesRepository } from "../services/expense-natures.service";

export const expenseNaturesRepository = {
  listForUser(userId) {
    return db
      .select({
        categoryId: expenseCategoryNatures.categoryId,
        nature: expenseCategoryNatures.nature,
      })
      .from(expenseCategoryNatures)
      .innerJoin(
        categories,
        and(
          eq(expenseCategoryNatures.categoryId, categories.id),
          eq(categories.userId, userId),
          eq(categories.type, "expense"),
        ),
      )
      .where(eq(expenseCategoryNatures.userId, userId))
      .orderBy(asc(categories.name));
  },

  async listExpenseCategoryIds(userId) {
    const rows = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.type, "expense")));
    return rows.map((row) => row.id);
  },

  async replaceForUser(userId, items) {
    await db.transaction(async (transaction) => {
      await transaction
        .delete(expenseCategoryNatures)
        .where(eq(expenseCategoryNatures.userId, userId));
      if (items.length > 0) {
        await transaction
          .insert(expenseCategoryNatures)
          .values(items.map((item) => ({ userId, ...item })));
      }
    });
  },
} satisfies ExpenseNaturesRepository;
