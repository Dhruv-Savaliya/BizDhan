import { v4 as uuidv4 } from "uuid";
import type { Db } from "mongodb";
import type { InvoiceBillType, InvoiceEntry, InvoiceStatus } from "@/types/invoice";

export function normalizeInvoiceInput(input: {
  invoiceNumber: unknown;
  partyName: unknown;
  clientEmail?: unknown;
  itemName?: unknown;
  quantity?: unknown;
  billType?: unknown;
  amount: unknown;
  currency?: unknown;
  issuedAt?: unknown;
  dueAt?: unknown;
  status?: unknown;
  notes?: unknown;
}) {
  const now = Date.now();

  const invoiceNumber =
    typeof input.invoiceNumber === "string" ? input.invoiceNumber.trim() : "";
  if (!invoiceNumber) throw new Error("Invoice or bill number is required");

  const partyName = typeof input.partyName === "string" ? input.partyName.trim() : "";
  if (!partyName) throw new Error("Party name is required");

  const clientEmailRaw = typeof input.clientEmail === "string" ? input.clientEmail.trim() : "";
  const itemNameRaw = typeof input.itemName === "string" ? input.itemName.trim() : "";
  const quantityNum =
    input.quantity === undefined || input.quantity === null || input.quantity === ""
      ? undefined
      : typeof input.quantity === "number"
        ? input.quantity
        : Number(input.quantity);

  const billTypeRaw = typeof input.billType === "string" ? input.billType : "payable";
  const billType = billTypeRaw as InvoiceBillType;
  if (billType !== "payable" && billType !== "receivable") {
    throw new Error("Invalid bill type");
  }

  let clientEmail: string | undefined;
  let itemName: string | undefined;
  let quantity: number | undefined;
  if (billType === "receivable") {
    if (!clientEmailRaw) {
      throw new Error("Client email is required for receivable invoices");
    }
    const email = clientEmailRaw.toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid client email");
    }
    clientEmail = email;

    if (!itemNameRaw) {
      throw new Error("Item name is required for receivable invoices");
    }
    itemName = itemNameRaw;

    if (!Number.isFinite(quantityNum) || (quantityNum ?? 0) <= 0) {
      throw new Error("Quantity must be a positive number for receivable invoices");
    }
    quantity = Number(quantityNum);
  }

  const amountNum = typeof input.amount === "number" ? input.amount : Number(input.amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const currency =
    typeof input.currency === "string" && input.currency.trim()
      ? input.currency.trim().toUpperCase()
      : "INR";

  let issuedAt = new Date().toISOString();
  if (typeof input.issuedAt === "string" && input.issuedAt.trim()) {
    const issuedAtDate = new Date(input.issuedAt);
    if (Number.isNaN(issuedAtDate.getTime())) {
      throw new Error("Invalid issue date");
    }
    // Allow up to 24 hours of drift for timezone differences
    if (issuedAtDate.getTime() > now + 24 * 60 * 60 * 1000) {
      throw new Error("Issue date cannot be in the future");
    }
    issuedAt = issuedAtDate.toISOString();
  }

  const dueAtRaw = typeof input.dueAt === "string" && input.dueAt.trim();
  let dueAt: string | undefined;
  if (dueAtRaw) {
    const dueAtDate = new Date(dueAtRaw);
    if (Number.isNaN(dueAtDate.getTime())) {
      throw new Error("Invalid due date");
    }
    dueAt = dueAtDate.toISOString();
  }

  const statusRaw = typeof input.status === "string" ? input.status : "unpaid";
  const status = statusRaw as InvoiceStatus;
  const allowed: InvoiceStatus[] = ["draft", "unpaid", "partial", "paid", "overdue"];
  if (!allowed.includes(status)) throw new Error("Invalid status");

  const notes = typeof input.notes === "string" && input.notes.trim() ? input.notes.trim() : undefined;

  return {
    invoiceNumber,
    partyName,
    clientEmail,
    itemName,
    quantity,
    billType,
    amount: amountNum,
    currency,
    issuedAt,
    dueAt,
    status,
    notes,
  };
}

export async function createInvoiceEntry(params: {
  db: Db;
  userId: string;
  workspaceId: string;
  invoiceNumber: string;
  partyName: string;
  clientEmail?: string;
  itemName?: string;
  quantity?: number;
  billType: InvoiceBillType;
  amount: number;
  currency: string;
  issuedAt: string;
  dueAt?: string;
  status: InvoiceStatus;
  notes?: string;
}) {
  const nowIso = new Date().toISOString();

  const entry: InvoiceEntry = {
    id: uuidv4(),
    userId: params.userId,
    workspaceId: params.workspaceId,
    invoiceNumber: params.invoiceNumber,
    partyName: params.partyName,
    clientEmail: params.clientEmail,
    itemName: params.itemName,
    quantity: params.quantity,
    billType: params.billType,
    amount: params.amount,
    currency: params.currency,
    issuedAt: params.issuedAt,
    dueAt: params.dueAt,
    status: params.status,
    notes: params.notes,
    created_at: nowIso,
    updated_at: nowIso,
  };

  await params.db.collection<InvoiceEntry>("invoice_entries").insertOne(entry);
  return entry;
}

export async function listInvoiceEntries(params: {
  db: Db;
  userId: string;
  workspaceId: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const items = await params.db
    .collection<InvoiceEntry>("invoice_entries")
    .find({ userId: params.userId, workspaceId: params.workspaceId })
    .sort({ issuedAt: -1, created_at: -1 })
    .limit(limit)
    .toArray();

  return items;
}
