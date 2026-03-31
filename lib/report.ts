import type { IncomeEntry } from "@/types/income";
import type { ExpenseEntry } from "@/types/expense";
import type { InvestmentEntry } from "@/types/investment";

export type MoneyByCurrency = Record<string, number>;

function addMoney(map: MoneyByCurrency, currency: string, amount: number) {
  map[currency] = (map[currency] ?? 0) + amount;
}

function topN(rows: Array<{ key: string; currency: string; amount: number }>, n = 10) {
  const byKeyCurrency = new Map<string, number>();
  for (const r of rows) {
    const k = `${r.key}||${r.currency}`;
    byKeyCurrency.set(k, (byKeyCurrency.get(k) ?? 0) + r.amount);
  }
  const out = [...byKeyCurrency.entries()]
    .map(([k, total]) => {
      const [key, currency] = k.split("||");
      return { key, currency, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
  return out;
}

export function computeTrackerStats(params: {
  income: IncomeEntry[];
  expense: ExpenseEntry[];
  investments: InvestmentEntry[];
}) {
  const incomeTotals: MoneyByCurrency = {};
  const expenseTotals: MoneyByCurrency = {};
  const investmentTotals: MoneyByCurrency = {};

  for (const i of params.income) addMoney(incomeTotals, i.currency, i.amount);
  for (const e of params.expense) addMoney(expenseTotals, e.currency, e.amount);
  for (const inv of params.investments) addMoney(investmentTotals, inv.currency, inv.amount);

  const cashflowTotals: MoneyByCurrency = {};
  const currencies = new Set([
    ...Object.keys(incomeTotals),
    ...Object.keys(expenseTotals),
    ...Object.keys(investmentTotals),
  ]);
  if (currencies.size === 0) currencies.add("INR");
  for (const c of currencies) {
    cashflowTotals[c] = (incomeTotals[c] ?? 0) - (expenseTotals[c] ?? 0);
  }

  const topIncomeSources = topN(
    params.income.map((i) => ({ key: i.source, currency: i.currency, amount: i.amount })),
    8
  );
  const topExpenseCategories = topN(
    params.expense.map((e) => ({ key: e.category, currency: e.currency, amount: e.amount })),
    8
  );
  const topExpenseMerchants = topN(
    params.expense.map((e) => ({ key: e.merchant, currency: e.currency, amount: e.amount })),
    8
  );
  const investmentByType = topN(
    params.investments.map((i) => ({ key: i.type, currency: i.currency, amount: i.amount })),
    8
  );

  const incomeCount = params.income.length;
  const expenseCount = params.expense.length;
  const investmentCount = params.investments.length;

  const latestReceivedAt = params.income[0]?.receivedAt;
  const latestSpentAt = params.expense[0]?.spentAt;
  const latestInvestedAt = params.investments[0]?.investedAt;

  return {
    counts: { incomeCount, expenseCount, investmentCount },
    totals: {
      incomeTotals,
      expenseTotals,
      investmentTotals,
      cashflowTotals,
    },
    tops: {
      topIncomeSources,
      topExpenseCategories,
      topExpenseMerchants,
      investmentByType,
    },
    latest: { latestReceivedAt, latestSpentAt, latestInvestedAt },
  };
}

export type TrackerStats = ReturnType<typeof computeTrackerStats>;

