export type ExpenseCategory =
  | "food"
  | "rent"
  | "utilities"
  | "transport"
  | "shopping"
  | "health"
  | "education"
  | "entertainment"
  | "travel"
  | "subscriptions"
  | "tax"
  | "marketing"
  | "store_expense"
  | "other";

export interface ExpenseEntry {
  id: string;
  userId: string;
  workspaceId: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  merchant: string;
  spentAt: string;
  receiptUrl?: string;
  receiptId?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

