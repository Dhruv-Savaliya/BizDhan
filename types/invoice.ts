export type InvoiceBillType = "payable" | "receivable";

export type InvoiceStatus = "draft" | "unpaid" | "partial" | "paid" | "overdue";

export interface InvoiceEntry {
  id: string;
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
  created_at: string;
  updated_at: string;
}
