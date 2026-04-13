import { getMongoDb } from "@/lib/database/clients";
import type { ExpenseEntry } from "@/types/expense";
import type { IncomeEntry } from "@/types/income";
import type { InvoiceEntry } from "@/types/invoice";
import type { Workspace } from "@/types/workspace";

export type FinancialExportData = {
  workspace: { id: string; name: string };
  period: { from: Date; to: Date; label: string };
  summary: { totalIncome: number; totalExpense: number; netProfit: number; totalGST: number };
  byCategory: Array<{ category: string; type: "income" | "expense"; total: number; count: number }>;
  transactions: Array<{
    date: string;
    type: string;
    category: string;
    description: string;
    amount: number;
    gstRate: number;
    gstAmount: number;
    netAmount: number;
  }>;
  invoices: Array<{ invoiceNo: string; client: string; amount: number; dueDate: string; status: string }>;
  topExpenses: Array<{ description: string; amount: number; category: string; date: string }>;
};

const GST_RATES: Record<string, number> = {
  "Raw Materials": 18,
  Software: 18,
  Marketing: 18,
  Travel: 5,
  "Food & Entertainment": 5,
  Utilities: 18,
};

function toTitleCase(value: string) {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeExpenseCategory(category: string) {
  const normalized = category.trim().toLowerCase();
  if (normalized === "marketing") return "Marketing";
  if (normalized === "travel") return "Travel";
  if (normalized === "utilities") return "Utilities";
  return toTitleCase(category);
}

function toIsoDateString(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

export async function aggregateFinancials(
  userId: string,
  workspaceId: string,
  from: Date,
  to: Date
): Promise<FinancialExportData> {
  const db = await getMongoDb();

  const workspace = await db
    .collection<Workspace>("workspaces")
    .findOne({ id: workspaceId, ownerUserId: userId });

  if (!workspace) {
    throw new Error("Workspace not found or access denied");
  }

  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const [income, expense, invoices] = await Promise.all([
    db
      .collection<IncomeEntry>("income_entries")
      .find({ userId, workspaceId, receivedAt: { $gte: fromIso, $lte: toIso } })
      .sort({ receivedAt: 1, created_at: 1 })
      .toArray(),
    db
      .collection<ExpenseEntry>("expense_entries")
      .find({ userId, workspaceId, spentAt: { $gte: fromIso, $lte: toIso } })
      .sort({ spentAt: 1, created_at: 1 })
      .toArray(),
    db
      .collection<InvoiceEntry>("invoice_entries")
      .find({ userId, workspaceId, issuedAt: { $gte: fromIso, $lte: toIso } })
      .sort({ issuedAt: 1, created_at: 1 })
      .toArray(),
  ]);

  const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = expense.reduce((sum, item) => sum + item.amount, 0);

  const expenseWithTax = expense.map((item) => {
    const category = normalizeExpenseCategory(item.category);
    const gstRate = GST_RATES[category] ?? 0;
    const gstAmount = gstRate > 0 ? (item.amount * gstRate) / (100 + gstRate) : 0;
    const netAmount = item.amount - gstAmount;
    return { item, category, gstRate, gstAmount, netAmount };
  });

  const totalGST = expenseWithTax.reduce((sum, item) => sum + item.gstAmount, 0);

  const byCategoryMap = new Map<string, { category: string; type: "income" | "expense"; total: number; count: number }>();
  for (const item of income) {
    const key = `income:${item.category}`;
    const existing = byCategoryMap.get(key);
    if (existing) {
      existing.total += item.amount;
      existing.count += 1;
      continue;
    }
    byCategoryMap.set(key, {
      category: item.category,
      type: "income",
      total: item.amount,
      count: 1,
    });
  }

  for (const taxed of expenseWithTax) {
    const key = `expense:${taxed.item.category}`;
    const existing = byCategoryMap.get(key);
    if (existing) {
      existing.total += taxed.item.amount;
      existing.count += 1;
      continue;
    }
    byCategoryMap.set(key, {
      category: taxed.item.category,
      type: "expense",
      total: taxed.item.amount,
      count: 1,
    });
  }

  const transactions = [
    ...income.map((item) => ({
      date: toIsoDateString(item.receivedAt),
      type: "income",
      category: item.category,
      description: item.source || item.notes || "",
      amount: item.amount,
      gstRate: 0,
      gstAmount: 0,
      netAmount: item.amount,
    })),
    ...expenseWithTax.map((taxed) => ({
      date: toIsoDateString(taxed.item.spentAt),
      type: "expense",
      category: taxed.item.category,
      description: taxed.item.merchant || taxed.item.notes || "",
      amount: taxed.item.amount,
      gstRate: taxed.gstRate,
      gstAmount: taxed.gstAmount,
      netAmount: taxed.netAmount,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const topExpenses = [...expense]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)
    .map((item) => ({
      description: item.merchant || item.notes || "",
      amount: item.amount,
      category: item.category,
      date: toIsoDateString(item.spentAt),
    }));

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
    },
    period: {
      from,
      to,
      label: `${toIsoDateString(fromIso)} to ${toIsoDateString(toIso)}`,
    },
    summary: {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      totalGST,
    },
    byCategory: Array.from(byCategoryMap.values()).sort((a, b) => b.total - a.total),
    transactions,
    invoices: invoices.map((item) => ({
      invoiceNo: item.invoiceNumber,
      client: item.partyName,
      amount: item.amount,
      dueDate: item.dueAt ? toIsoDateString(item.dueAt) : "",
      status: item.status,
    })),
    topExpenses,
  };
}
