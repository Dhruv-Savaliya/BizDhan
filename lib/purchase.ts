import { v4 as uuidv4 } from "uuid";
import type { Db } from "mongodb";
import type { PurchaseCategory, PurchaseEntry } from "@/types/purchase";

export function normalizePurchaseInput(input: {
  itemName: unknown;
  quantity: unknown;
  unit?: unknown;
  supplier: unknown;
  amount: unknown;
  currency?: unknown;
  category?: unknown;
  purchasedAt?: unknown;
  notes?: unknown;
}) {
  const itemName = typeof input.itemName === "string" ? input.itemName.trim() : "";
  if (!itemName) throw new Error("Item name is required");

  const qtyNum = typeof input.quantity === "number" ? input.quantity : Number(input.quantity);
  if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
    throw new Error("Quantity must be a positive number");
  }

  const unitRaw = typeof input.unit === "string" ? input.unit.trim() : "";
  const unit = unitRaw || "pcs";

  const supplier = typeof input.supplier === "string" ? input.supplier.trim() : "";
  if (!supplier) throw new Error("Supplier is required");

  const amountNum = typeof input.amount === "number" ? input.amount : Number(input.amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const currency =
    typeof input.currency === "string" && input.currency.trim()
      ? input.currency.trim().toUpperCase()
      : "INR";

  const categoryRaw = typeof input.category === "string" ? input.category : "other";
  const category = categoryRaw as PurchaseCategory;

  const purchasedAt =
    typeof input.purchasedAt === "string" && input.purchasedAt.trim()
      ? new Date(input.purchasedAt).toISOString()
      : new Date().toISOString();

  const notes = typeof input.notes === "string" && input.notes.trim() ? input.notes.trim() : undefined;

  return {
    itemName,
    quantity: qtyNum,
    unit,
    supplier,
    amount: amountNum,
    currency,
    category,
    purchasedAt,
    notes,
  };
}

export async function createPurchaseEntry(params: {
  db: Db;
  userId: string;
  workspaceId: string;
  itemName: string;
  quantity: number;
  unit: string;
  supplier: string;
  amount: number;
  currency: string;
  category: PurchaseCategory;
  purchasedAt: string;
  notes?: string;
}) {
  const nowIso = new Date().toISOString();

  const entry: PurchaseEntry = {
    id: uuidv4(),
    userId: params.userId,
    workspaceId: params.workspaceId,
    itemName: params.itemName,
    quantity: params.quantity,
    unit: params.unit,
    supplier: params.supplier,
    amount: params.amount,
    currency: params.currency,
    category: params.category,
    purchasedAt: params.purchasedAt,
    notes: params.notes,
    created_at: nowIso,
    updated_at: nowIso,
  };

  await params.db.collection<PurchaseEntry>("purchase_entries").insertOne(entry);
  return entry;
}

export async function listPurchaseEntries(params: {
  db: Db;
  userId: string;
  workspaceId: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const items = await params.db
    .collection<PurchaseEntry>("purchase_entries")
    .find({ userId: params.userId, workspaceId: params.workspaceId })
    .sort({ purchasedAt: -1, created_at: -1 })
    .limit(limit)
    .toArray();

  return items;
}
