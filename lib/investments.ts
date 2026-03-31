import { v4 as uuidv4 } from "uuid";
import type { Db } from "mongodb";
import type { InvestmentEntry, InvestmentType } from "@/types/investment";

export function normalizeInvestmentInput(input: {
  amount: unknown;
  currency?: unknown;
  type?: unknown;
  assetName: unknown;
  investedAt?: unknown;
  notes?: unknown;
}) {
  const amountNum = typeof input.amount === "number" ? input.amount : Number(input.amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const currency =
    typeof input.currency === "string" && input.currency.trim()
      ? input.currency.trim().toUpperCase()
      : "INR";

  const typeRaw = typeof input.type === "string" ? input.type : "other";
  const type = typeRaw as InvestmentType;

  const assetName = typeof input.assetName === "string" ? input.assetName.trim() : "";
  if (!assetName) throw new Error("Asset name is required");

  const investedAt =
    typeof input.investedAt === "string" && input.investedAt.trim()
      ? new Date(input.investedAt).toISOString()
      : new Date().toISOString();

  const notes = typeof input.notes === "string" && input.notes.trim() ? input.notes.trim() : undefined;

  return { amount: amountNum, currency, type, assetName, investedAt, notes };
}

export async function createInvestmentEntry(params: {
  db: Db;
  userId: string;
  workspaceId: string;
  amount: number;
  currency: string;
  type: InvestmentType;
  assetName: string;
  investedAt: string;
  notes?: string;
}) {
  const nowIso = new Date().toISOString();

  const entry: InvestmentEntry = {
    id: uuidv4(),
    userId: params.userId,
    workspaceId: params.workspaceId,
    amount: params.amount,
    currency: params.currency,
    type: params.type,
    assetName: params.assetName,
    investedAt: params.investedAt,
    notes: params.notes,
    created_at: nowIso,
    updated_at: nowIso,
  };

  await params.db.collection<InvestmentEntry>("investment_entries").insertOne(entry);
  return entry;
}

export async function listInvestmentEntries(params: {
  db: Db;
  userId: string;
  workspaceId: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const items = await params.db
    .collection<InvestmentEntry>("investment_entries")
    .find({ userId: params.userId, workspaceId: params.workspaceId })
    .sort({ investedAt: -1, created_at: -1 })
    .limit(limit)
    .toArray();

  return items;
}

