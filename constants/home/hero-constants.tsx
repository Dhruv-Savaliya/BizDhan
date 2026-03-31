"use client";

import type { LucideIcon } from "lucide-react";
import { Wallet, LineChart, Receipt, Building2 } from "lucide-react";

export type HeroHighlight = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const HERO_CONTENT = {
  id: "hero",
  headline: {
    primary: "Your finances,",
    secondary: "one dashboard.",
  },
  description:
    "Personal budgets. SME invoicing. Investment tracking. Bizdhan unifies everything under one login — pick your mode and go.",
  ctas: {
    primary: { href: "/signup", label: "Start for free" },
    secondary: { href: "/login", label: "Sign in" },
  },
  highlights: [
    { icon: Wallet, title: "Personal", description: "Budgets, expenses, goals" },
    { icon: LineChart, title: "Invest", description: "Holdings, returns, insights" },
    { icon: Receipt, title: "SME", description: "Invoices, payments, taxes" },
    { icon: Building2, title: "Workspaces", description: "Personal / SME / Both" },
  ] as HeroHighlight[],
} as const;
