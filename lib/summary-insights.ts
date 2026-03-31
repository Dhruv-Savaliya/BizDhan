import type { IncomeEntry } from "@/types/income";
import type { ExpenseEntry } from "@/types/expense";
import type { InvoiceEntry } from "@/types/invoice";

const MS_DAY = 86_400_000;
const MS_30 = 30 * MS_DAY;

export type CashRunwayInsight = {
  currency: string;
  income30d: number;
  expense30d: number;
  net30d: number;
  monthlyIncomeEstimate: number;
  monthlyBurnEstimate: number;
  cumulativeNet: number;
  runwayMonths: number | null;
  status: "surplus" | "balanced" | "deficit" | "insufficient_data";
  headline: string;
  detail: string;
};

export type FinancialHealthScore = {
  score: number;
  label: string;
  breakdown: Array<{ key: string; label: string; value: number; weight: number; note: string }>;
};

export type ExpenseLeak = {
  kind: "category" | "merchant";
  name: string;
  sharePercent: number;
  amount: number;
  currency: string;
  severity: "high" | "medium" | "low";
};

export type OverdueItem = {
  id: string;
  invoiceNumber: string;
  partyName: string;
  amount: number;
  currency: string;
  dueAt: string;
  daysPastDue: number;
  billType: string;
};

function parseTime(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function sumInRange(
  entries: Array<{ amount: number; currency: string; at: string }>,
  currency: string,
  since: number
): number {
  let s = 0;
  for (const e of entries) {
    if (e.currency !== currency) continue;
    if (parseTime(e.at) < since) continue;
    s += e.amount;
  }
  return s;
}

export function computeCashRunway(params: {
  income: IncomeEntry[];
  expense: ExpenseEntry[];
  currency: string;
}): CashRunwayInsight {
  const { income, expense, currency } = params;
  const now = Date.now();
  const since30 = now - MS_30;

  const incomeRows = income.map((i) => ({
    amount: i.amount,
    currency: i.currency,
    at: i.receivedAt,
  }));
  const expenseRows = expense.map((e) => ({
    amount: e.amount,
    currency: e.currency,
    at: e.spentAt,
  }));

  const income30d = sumInRange(incomeRows, currency, since30);
  const expense30d = sumInRange(expenseRows, currency, since30);
  const net30d = income30d - expense30d;

  let cumulativeNet = 0;
  for (const i of income) {
    if (i.currency === currency) cumulativeNet += i.amount;
  }
  for (const e of expense) {
    if (e.currency === currency) cumulativeNet -= e.amount;
  }

  const monthlyIncomeEstimate = income30d;
  const monthlyBurnEstimate = expense30d;

  if (income30d === 0 && expense30d === 0) {
    return {
      currency,
      income30d: 0,
      expense30d: 0,
      net30d: 0,
      monthlyIncomeEstimate: 0,
      monthlyBurnEstimate: 0,
      cumulativeNet,
      runwayMonths: null,
      status: "insufficient_data",
      headline: "Not enough recent activity",
      detail: `Add income and expense in ${currency} in the last 30 days to estimate runway.`,
    };
  }

  if (net30d >= 0) {
    const runwayMonths =
      expense30d > 0 ? income30d / Math.max(expense30d, 1e-9) : null;
    return {
      currency,
      income30d,
      expense30d,
      net30d,
      monthlyIncomeEstimate,
      monthlyBurnEstimate,
      cumulativeNet,
      runwayMonths: runwayMonths != null ? Math.round(runwayMonths * 10) / 10 : null,
      status: net30d === 0 ? "balanced" : "surplus",
      headline: net30d === 0 ? "Balanced over 30 days" : "Cash-positive period",
      detail:
        net30d === 0
          ? `Income and expense matched in the last 30 days (${currency}).`
          : `Estimated surplus of ${currency} ${net30d.toLocaleString()} in the last 30 days. Income covers ${runwayMonths != null ? `${runwayMonths.toFixed(1)}×` : ""} spend at current rates.`,
    };
  }

  const monthlyDeficit = -net30d;
  let runwayMonths: number | null = null;
  if (monthlyDeficit > 0 && cumulativeNet > 0) {
    runwayMonths = cumulativeNet / monthlyDeficit;
  } else if (monthlyDeficit > 0 && cumulativeNet <= 0) {
    runwayMonths = 0;
  }

  return {
    currency,
    income30d,
    expense30d,
    net30d,
    monthlyIncomeEstimate,
    monthlyBurnEstimate,
    cumulativeNet,
    runwayMonths: runwayMonths != null ? Math.round(runwayMonths * 10) / 10 : null,
    status: "deficit",
    headline: "Spending above income (30d)",
    detail:
      runwayMonths != null && runwayMonths > 0
        ? `All-time net in ${currency} is ${currency} ${cumulativeNet.toLocaleString()}. At the last 30-day deficit of ${currency} ${monthlyDeficit.toLocaleString()}, estimated runway is about ${runwayMonths.toFixed(1)} months if no income is added.`
        : `Last 30 days: deficit ${currency} ${monthlyDeficit.toLocaleString()}. Improve income or trim expenses to extend runway.`,
  };
}

export function computeExpenseLeaks(
  expense: ExpenseEntry[],
  currency: string,
  limit = 6
): ExpenseLeak[] {
  const rows = expense.filter((e) => e.currency === currency);
  if (rows.length === 0) return [];

  let total = 0;
  const byCat = new Map<string, number>();
  const byMerch = new Map<string, number>();
  for (const e of rows) {
    total += e.amount;
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
    byMerch.set(e.merchant, (byMerch.get(e.merchant) ?? 0) + e.amount);
  }
  if (total <= 0) return [];

  const out: ExpenseLeak[] = [];
  for (const [name, amount] of byCat) {
    const share = (amount / total) * 100;
    out.push({
      kind: "category",
      name,
      sharePercent: Math.round(share * 10) / 10,
      amount,
      currency,
      severity: share >= 40 ? "high" : share >= 28 ? "medium" : "low",
    });
  }
  for (const [name, amount] of byMerch) {
    const share = (amount / total) * 100;
    out.push({
      kind: "merchant",
      name,
      sharePercent: Math.round(share * 10) / 10,
      amount,
      currency,
      severity: share >= 35 ? "high" : share >= 25 ? "medium" : "low",
    });
  }

  return out
    .filter((x) => x.severity !== "low" || x.sharePercent >= 20)
    .sort((a, b) => b.sharePercent - a.sharePercent)
    .slice(0, limit);
}

export function computeOverdueInvoices(invoices: InvoiceEntry[], now = Date.now()): OverdueItem[] {
  const out: OverdueItem[] = [];
  for (const inv of invoices) {
    if (!inv.dueAt) continue;
    if (inv.status === "paid" || inv.status === "draft") continue;
    const due = parseTime(inv.dueAt);
    if (due >= now) continue;
    const daysPastDue = Math.floor((now - due) / MS_DAY);
    out.push({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      partyName: inv.partyName,
      amount: inv.amount,
      currency: inv.currency,
      dueAt: inv.dueAt,
      daysPastDue,
      billType: inv.billType,
    });
  }
  return out.sort((a, b) => b.daysPastDue - a.daysPastDue);
}

export function computeFinancialHealthScore(params: {
  income30d: number;
  expense30d: number;
  overdueCount: number;
  topCategoryShare: number;
}): FinancialHealthScore {
  const { income30d, expense30d, overdueCount, topCategoryShare } = params;

  const net = income30d - expense30d;
  const ratio = income30d > 0 ? expense30d / income30d : expense30d > 0 ? 99 : 0;

  let cashflowPts = 0;
  if (income30d === 0 && expense30d === 0) {
    cashflowPts = 8;
  } else if (income30d >= expense30d) {
    cashflowPts = 35;
  } else {
    cashflowPts = Math.round(35 * (income30d / Math.max(expense30d, 1e-9)));
  }

  let ratioPts = 0;
  if (income30d > 0) {
    ratioPts = Math.round(30 * Math.max(0, Math.min(1, 1.15 - ratio)));
  } else {
    ratioPts = expense30d > 0 ? 5 : 12;
  }

  const overduePts = Math.max(0, 20 - overdueCount * 6);

  const concentrationPts = Math.round(
    15 * (1 - Math.min(1, topCategoryShare / 85))
  );

  const breakdown = [
    {
      key: "cashflow",
      label: "30-day cashflow",
      value: cashflowPts,
      weight: 35,
      note:
        net >= 0
          ? "Income meets or beats spend in the last 30 days."
          : "Spend exceeds income in the last 30 days.",
    },
    {
      key: "ratio",
      label: "Expense vs income",
      value: ratioPts,
      weight: 30,
      note:
        income30d > 0
          ? `Expense is ${(ratio * 100).toFixed(0)}% of income (lower is better).`
          : "Add income entries to measure this ratio.",
    },
    {
      key: "overdue",
      label: "Overdue bills",
      value: overduePts,
      weight: 20,
      note:
        overdueCount === 0
          ? "No overdue invoices with a due date."
          : `${overdueCount} overdue item(s).`,
    },
    {
      key: "concentration",
      label: "Expense spread",
      value: concentrationPts,
      weight: 15,
      note:
        topCategoryShare > 0
          ? `Largest category ~${topCategoryShare.toFixed(0)}% of spend.`
          : "Not enough expense data.",
    },
  ];

  const score = Math.round(
    breakdown.reduce((acc, b) => acc + b.value, 0)
  );
  const clamped = Math.max(0, Math.min(100, score));

  let label = "Needs attention";
  if (clamped >= 75) label = "Strong";
  else if (clamped >= 55) label = "Fair";
  else if (clamped >= 35) label = "At risk";

  return { score: clamped, label, breakdown };
}

export function pickPrimaryCurrency(
  income: IncomeEntry[],
  expense: ExpenseEntry[]
): string {
  const counts = new Map<string, number>();
  for (const i of income) {
    const c = i.currency || "INR";
    counts.set(c, (counts.get(c) ?? 0) + i.amount);
  }
  for (const e of expense) {
    const c = e.currency || "INR";
    counts.set(c, (counts.get(c) ?? 0) + e.amount);
  }
  let best = "INR";
  let max = 0;
  for (const [c, v] of counts) {
    if (v > max) {
      max = v;
      best = c;
    }
  }
  return best;
}

export function topCategorySharePercent(expense: ExpenseEntry[], currency: string): number {
  const rows = expense.filter((e) => e.currency === currency);
  if (rows.length === 0) return 0;
  let total = 0;
  const byCat = new Map<string, number>();
  for (const e of rows) {
    total += e.amount;
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
  }
  if (total <= 0) return 0;
  let top = 0;
  for (const v of byCat.values()) {
    if (v > top) top = v;
  }
  return (top / total) * 100;
}
