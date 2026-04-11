import { v4 as uuidv4 } from "uuid";
import type { Db } from "mongodb";
import type { ExpenseCategory, ExpenseEntry } from "@/types/expense";

export function normalizeExpenseInput(input: {
  amount: unknown;
  currency?: unknown;
  category?: unknown;
  merchant: unknown;
  spentAt?: unknown;
  notes?: unknown;
}) {
  const now = Date.now();

  const amountNum = typeof input.amount === "number" ? input.amount : Number(input.amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const currency =
    typeof input.currency === "string" && input.currency.trim()
      ? input.currency.trim().toUpperCase()
      : "INR";

  const categoryRaw = typeof input.category === "string" ? input.category : "other";
  const category = categoryRaw as ExpenseCategory;

  const merchant = typeof input.merchant === "string" ? input.merchant.trim() : "";
  if (!merchant) throw new Error("Merchant is required");

  let spentAt = new Date().toISOString();
  if (typeof input.spentAt === "string" && input.spentAt.trim()) {
    const spentAtDate = new Date(input.spentAt);
    if (Number.isNaN(spentAtDate.getTime())) {
      throw new Error("Invalid date");
    }
    if (spentAtDate.getTime() > now) {
      throw new Error("Date cannot be in the future");
    }
    spentAt = spentAtDate.toISOString();
  }

  const notes = typeof input.notes === "string" && input.notes.trim() ? input.notes.trim() : undefined;

  return { amount: amountNum, currency, category, merchant, spentAt, notes };
}

export async function createExpenseEntry(params: {
  db: Db;
  userId: string;
  workspaceId: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  merchant: string;
  spentAt: string;
  notes?: string;
}) {
  const nowIso = new Date().toISOString();

  const entry: ExpenseEntry = {
    id: uuidv4(),
    userId: params.userId,
    workspaceId: params.workspaceId,
    amount: params.amount,
    currency: params.currency,
    category: params.category,
    merchant: params.merchant,
    spentAt: params.spentAt,
    notes: params.notes,
    created_at: nowIso,
    updated_at: nowIso,
  };

  await params.db.collection<ExpenseEntry>("expense_entries").insertOne(entry);
  return entry;
}

export async function listExpenseEntries(params: {
  db: Db;
  userId: string;
  workspaceId: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const items = await params.db
    .collection<ExpenseEntry>("expense_entries")
    .find({ userId: params.userId, workspaceId: params.workspaceId })
    .sort({ spentAt: -1, created_at: -1 })
    .limit(limit)
    .toArray();

  return items;
}

