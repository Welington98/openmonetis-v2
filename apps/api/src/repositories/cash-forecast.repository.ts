import { db, financialAccounts, people, transactionSplits, transactions } from "@openmonetis/db";
import { and, eq, gte, isNull, lte, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { CashForecastRepository } from "../services/cash-forecast.service";
import { effectiveSplitAmountSql, effectiveTransactionAmountSql } from "./settlements.repository";

const transactionPeople = alias(people, "cash_forecast_transaction_people");
const splitPeople = alias(people, "cash_forecast_split_people");

const toDate = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null;

export const cashForecastRepository = {
  /**
   * Account transactions (never card purchases, which reach cash through their invoice) of the
   * primary person scheduled from `fromPeriod` through `toPeriod`, on active accounts that count
   * towards the total balance. Amounts are signed: income positive, expenses negative.
   */
  async listScheduledTransactions(userId, fromPeriod, toPeriod) {
    const rows = await db
      .select({
        name: transactions.name,
        type: transactions.type,
        period: transactions.period,
        paymentMethod: transactions.paymentMethod,
        purchaseDate: transactions.purchaseDate,
        dueDate: transactions.dueDate,
        boletoPaymentDate: transactions.boletoPaymentDate,
        settledDate: transactions.settledDate,
        isSettled: transactions.isSettled,
        amount:
          sql<string>`sum(case when ${transactionSplits.id} is not null then ${effectiveSplitAmountSql} else ${effectiveTransactionAmountSql} end)`.as(
            "amount",
          ),
      })
      .from(transactions)
      .innerJoin(
        financialAccounts,
        and(
          eq(transactions.accountId, financialAccounts.id),
          eq(financialAccounts.userId, userId),
          eq(financialAccounts.isArchived, false),
          eq(financialAccounts.excludeFromBalance, false),
        ),
      )
      .innerJoin(
        transactionPeople,
        and(eq(transactions.personId, transactionPeople.id), eq(transactionPeople.userId, userId)),
      )
      .leftJoin(
        transactionSplits,
        and(
          eq(transactionSplits.transactionId, transactions.id),
          eq(transactionSplits.userId, userId),
        ),
      )
      .leftJoin(
        splitPeople,
        and(eq(transactionSplits.personId, splitPeople.id), eq(splitPeople.userId, userId)),
      )
      .where(
        and(
          eq(transactions.userId, userId),
          isNull(transactions.cardId),
          ne(transactions.origin, "personSettlement"),
          gte(transactions.period, fromPeriod),
          lte(transactions.period, toPeriod),
          or(
            and(isNull(transactionSplits.id), eq(transactionPeople.role, "admin")),
            eq(splitPeople.role, "admin"),
          ),
        ),
      )
      .groupBy(transactions.id);

    return rows.map((row) => ({
      ...row,
      amount: Number(row.amount),
      purchaseDate: toDate(row.purchaseDate) as string,
      dueDate: toDate(row.dueDate),
      boletoPaymentDate: toDate(row.boletoPaymentDate),
      settledDate: toDate(row.settledDate),
    }));
  },
} satisfies CashForecastRepository;
