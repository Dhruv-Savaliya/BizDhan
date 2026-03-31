export type IncomeCategory =
  | "salary"
  | "freelance"
  | "business"
  | "interest"
  | "dividend"
  | "rental"
  | "gift"
  | "other";

export interface IncomeEntry {
  id: string;
  userId: string;
  workspaceId: string;
  amount: number;
  currency: string;
  category: IncomeCategory;
  source: string;
  receivedAt: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

