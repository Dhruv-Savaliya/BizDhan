import { NextResponse } from "next/server";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getMongoDb } from "@/lib/database/clients";
import { groqChat } from "@/lib/groq";
import { computeTrackerStats } from "@/lib/report";
import type { IncomeEntry } from "@/types/income";
import type { ExpenseEntry } from "@/types/expense";
import type { InvestmentEntry } from "@/types/investment";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.RECEIPT_LLM_MODEL || "llama-3.1-70b-versatile";

export async function POST() {
  const user = await getCurrentUserAction();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  if (!GROQ_API_KEY) {
    return NextResponse.json({ message: "Missing GROQ_API_KEY" }, { status: 500 });
  }

  const workspaceId = user.defaultWorkspaceId ?? "default";
  const db = await getMongoDb();

  const limit = 300;
  const [income, expense, investments] = await Promise.all([
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
  ]);

  const stats = computeTrackerStats({
    income,
    expense,
    investments,
  });

  const prompt = JSON.stringify(
    {
      workspaceId,
      generatedAt: new Date().toISOString(),
      counts: stats.counts,
      totals: stats.totals,
      tops: stats.tops,
      latest: stats.latest,
      sample: {
        income: income.slice(0, 30),
        expense: expense.slice(0, 30),
        investments: investments.slice(0, 30),
      },
    },
    null,
    2
  );

  try {
    const report = await groqChat({
      apiKey: GROQ_API_KEY,
      model: GROQ_MODEL,
      temperature: 0.2,
      maxTokens: 2048,
      messages: [
        {
          role: "system",
          content:
            [
              "You are a finance analyst generating a professional report for a finance tracking app.",
              "Return STRICT JSON only (no markdown, no code fences, no text before or after the JSON object).",
              "Use this exact shape:",
              "{",
              '  "title": string,',
              '  "generatedAt": string (ISO),',
              '  "executiveSummary": string[],',
              '  "kpis": Array<{ "label": string, "currency": string, "value": number }>,',
              '  "tables": {',
              '    "topIncomeSources": Array<{ "source": string, "currency": string, "total": number }>,',
              '    "topExpenseCategories": Array<{ "category": string, "currency": string, "total": number }>,',
              '    "topExpenseMerchants": Array<{ "merchant": string, "currency": string, "total": number }>,',
              '    "investmentByType": Array<{ "type": string, "currency": string, "total": number }>',
              "  },",
              '  "highlights": string[],',
              '  "risks": string[],',
              '  "recommendations": string[],',
              '  "nextSteps": string[]',
              "}",
              "Rules:",
              "- Use ONLY numbers present in the input stats.",
              "- Prefer crisp, professional language.",
              "- If data is sparse, say what's missing and provide next steps.",
              "- KPIs should include Income, Expense, Cashflow, Investments per currency (if present).",
              "- Tables should take from the provided 'tops' stats, not from raw samples.",
            ].join("\n"),
        },
        { role: "user", content: prompt },
      ],
    });

    return NextResponse.json({ report, stats }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to generate report";
    return NextResponse.json({ message }, { status: 500 });
  }
}

