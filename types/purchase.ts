export type PurchaseCategory =
  | "raw_materials"
  | "retail_stock"
  | "equipment"
  | "packaging"
  | "consumables"
  | "other";

export interface PurchaseEntry {
  id: string;
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
  created_at: string;
  updated_at: string;
}
