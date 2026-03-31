"use client";

import type { LucideIcon } from "lucide-react";
import {
  LineChart,
  Wallet,
  Target,
  Receipt,
  BadgePercent,
  Building2,
  ShieldCheck,
  ArrowLeftRight,
  Layers,
} from "lucide-react";

export type FeatureItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const FEATURES_CONTENT = {
  id: "features",
  eyebrow: "Features",
  title: "Personal + SME finance in one account",
  description:
    "Two focused modes with separate workspaces, unified login, and data structures that scale from solo to small teams.",
  items: [
    {
      icon: Wallet,
      title: "Personal finance tracking",
      description:
        "Track income/expenses, categorize transactions, budgets, and monthly summaries.",
    },
    {
      icon: LineChart,
      title: "Investments & net worth",
      description:
        "Monitor holdings, performance, and net worth trends over time.",
    },
    {
      icon: Target,
      title: "Goals & planning",
      description:
        "Create savings goals and get progress insights tied to your real spending.",
    },
    {
      icon: Receipt,
      title: "SME billing & invoicing",
      description:
        "Create invoices, track payments, maintain customer ledgers, and export reports.",
    },
    {
      icon: BadgePercent,
      title: "Taxes & compliance ready",
      description:
        "Organize transactions for filings with clean categories and audit-friendly history.",
    },
    {
      icon: Building2,
      title: "Workspace-based separation",
      description:
        "Personal and SME data stay separate; choose Personal / SME / Both at signup.",
    },
    {
      icon: ShieldCheck,
      title: "Secure by default",
      description:
        "HttpOnly JWT cookies and server-side access checks for protected pages.",
    },
    {
      icon: ArrowLeftRight,
      title: "Switch modes instantly",
      description:
        "Use the same account to hop between personal and SME workspaces (if enabled).",
    },
  ] as FeatureItem[],
} as const;


