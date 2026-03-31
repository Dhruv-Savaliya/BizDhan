export type InvestmentType =
  | "stocks"
  | "mutual_fund"
  | "crypto"
  | "fd"
  | "rd"
  | "bond"
  | "gold"
  | "real_estate"
  | "ppf"
  | "nps"
  | "other";

export interface InvestmentEntry {
  id: string;
  userId: string;
  workspaceId: string;
  amount: number;
  currency: string;
  type: InvestmentType;
  assetName: string;
  investedAt: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

