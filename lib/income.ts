import { v4 as uuidv4 } from "uuid";
import type { Db } from "mongodb";
import type { IncomeCategory, IncomeEntry } from "@/types/income";

export function normalizeIncomeInput(input: {
  amount: unknown;
  currency?: unknown;
  category?: unknown;
  source: unknown;
  receivedAt?: unknown;
  notes?: unknown;
}) {
  const now = Date.now();

  const amountNum = typeof input.amount === "number" ? input.amount : Number(input.amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const currency = typeof input.currency === "string" && input.currency.trim()
    ? input.currency.trim().toUpperCase()
    : "INR";

  const categoryRaw = typeof input.category === "string" ? input.category : "other";
  const category = categoryRaw as IncomeCategory;

  const source = typeof input.source === "string" ? input.source.trim() : "";
  if (!source) throw new Error("Source is required");

  let receivedAt = new Date().toISOString();
  if (typeof input.receivedAt === "string" && input.receivedAt.trim()) {
    const receivedAtDate = new Date(input.receivedAt);
    if (Number.isNaN(receivedAtDate.getTime())) {
      throw new Error("Invalid date");
    }
    // Allow up to 24 hours of drift for timezone differences
    if (receivedAtDate.getTime() > now + 24 * 60 * 60 * 1000) {
      throw new Error("Date cannot be in the future");
    }
    receivedAt = receivedAtDate.toISOString();
  }

  const notes = typeof input.notes === "string" && input.notes.trim() ? input.notes.trim() : undefined;

  return { amount: amountNum, currency, category, source, receivedAt, notes };
}

export async function createIncomeEntry(params: {
  db: Db;
  userId: string;
  workspaceId: string;
  amount: number;
  currency: string;
  category: IncomeCategory;
  source: string;
  receivedAt: string;
  notes?: string;
}) {
  const nowIso = new Date().toISOString();

  const entry: IncomeEntry = {
    id: uuidv4(),
    userId: params.userId,
    workspaceId: params.workspaceId,
    amount: params.amount,
    currency: params.currency,
    category: params.category,
    source: params.source,
    receivedAt: params.receivedAt,
    notes: params.notes,
    created_at: nowIso,
    updated_at: nowIso,
  };

  await params.db.collection<IncomeEntry>("income_entries").insertOne(entry);
  return entry;
}

export async function listIncomeEntries(params: {
  db: Db;
  userId: string;
  workspaceId: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const items = await params.db
    .collection<IncomeEntry>("income_entries")
    .find({ userId: params.userId, workspaceId: params.workspaceId })
    .sort({ receivedAt: -1, created_at: -1 })
    .limit(limit)
    .toArray();

  return items;
}

