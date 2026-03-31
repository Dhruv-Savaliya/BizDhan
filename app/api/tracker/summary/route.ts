import { NextResponse } from "next/server";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getMongoDb } from "@/lib/database/clients";
import { computeTrackerStats } from "@/lib/report";
import {
  computeCashRunway,
  computeExpenseLeaks,
  computeFinancialHealthScore,
  computeOverdueInvoices,
  pickPrimaryCurrency,
  topCategorySharePercent,
} from "@/lib/summary-insights";
import type { IncomeEntry } from "@/types/income";
import type { ExpenseEntry } from "@/types/expense";
import type { InvestmentEntry } from "@/types/investment";
import type { InvoiceEntry } from "@/types/invoice";

export async function GET() {
  const user = await getCurrentUserAction();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const workspaceId = user.defaultWorkspaceId ?? "default";
  const db = await getMongoDb();
  const limit = 500;

  const [income, expense, investments, invoices] = await Promise.all([
    db
      .collection<IncomeEntry>("income_entries")
      .find({ userId: user.id, workspaceId })
      .sort({ receivedAt: -1, created_at: -1 })
      .limit(limit)
      .toArray(),
    db
      .collection<ExpenseEntry>("expense_entries")
      .find({ userId: user.id, workspaceId })
      .sort({ spentAt: -1, created_at: -1 })
      .limit(limit)
      .toArray(),
    db
      .collection<InvestmentEntry>("investment_entries")
      .find({ userId: user.id, workspaceId })
      .sort({ investedAt: -1, created_at: -1 })
      .limit(limit)
      .toArray(),
    db
      .collection<InvoiceEntry>("invoice_entries")
      .find({ userId: user.id, workspaceId })
      .sort({ dueAt: -1, issuedAt: -1 })
      .limit(200)
      .toArray(),
  ]);

  const stats = computeTrackerStats({
    income,
    expense,
    investments,
  });

  const primaryCurrency = pickPrimaryCurrency(income, expense);
  const cashRunway = computeCashRunway({ income, expense, currency: primaryCurrency });
  const overdueInvoices = computeOverdueInvoices(invoices);
  const expenseLeaks = computeExpenseLeaks(expense, primaryCurrency);
  const topShare = topCategorySharePercent(expense, primaryCurrency);
  const financialHealth = computeFinancialHealthScore({
    income30d: cashRunway.income30d,
    expense30d: cashRunway.expense30d,
    overdueCount: overdueInvoices.length,
    topCategoryShare: topShare,
  });

  return NextResponse.json(
    {
      stats,
      generatedAt: new Date().toISOString(),
      primaryCurrency,
      cashRunway,
      financialHealth,
      expenseLeaks,
      overdueInvoices,
    },
    { status: 200 }
  );
}
