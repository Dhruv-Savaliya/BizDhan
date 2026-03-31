import type { Db } from "mongodb";
import type { InvestSummary } from "@/types/invest";
import type { IncomeEntry } from "@/types/income";
import type { ExpenseEntry } from "@/types/expense";

async function sumByCurrency<T extends { currency: string; amount: number }>(params: {
  collectionName: string;
  db: Db;
  userId: string;
  workspaceId: string;
}) {
  const rows = await params.db
    .collection<T>(params.collectionName)
    .aggregate<{ _id: string; total: number }>([
      { $match: { userId: params.userId, workspaceId: params.workspaceId } },
      { $group: { _id: "$currency", total: { $sum: "$amount" } } },
    ])
    .toArray();

  return new Map(rows.map((r) => [r._id, r.total] as const));
}

export async function getInvestSummary(params: { db: Db; userId: string; workspaceId: string }) {
  const income = await sumByCurrency<Pick<IncomeEntry, "userId" | "workspaceId" | "currency" | "amount">>({
    db: params.db,
    userId: params.userId,
    workspaceId: params.workspaceId,
    collectionName: "income_entries",
  });

  const expense = await sumByCurrency<Pick<ExpenseEntry, "userId" | "workspaceId" | "currency" | "amount">>({
    db: params.db,
    userId: params.userId,
    workspaceId: params.workspaceId,
    collectionName: "expense_entries",
  });

  const currencies = new Set<string>([...income.keys(), ...expense.keys()]);
  if (currencies.size === 0) currencies.add("INR");

  const summaries: InvestSummary[] = [...currencies].sort().map((currency) => {
    const totalIncome = income.get(currency) ?? 0;
    const totalExpense = expense.get(currency) ?? 0;
    return {
      currency,
      totalIncome,
      totalExpense,
      availableToInvest: totalIncome - totalExpense,
    };
  });

  return summaries;
}

