import type { TrackerStats } from "@/lib/report";

export type ReportTables = {
  topIncomeSources: Array<{ source: string; currency: string; total: number }>;
  topExpenseCategories: Array<{ category: string; currency: string; total: number }>;
  topExpenseMerchants: Array<{ merchant: string; currency: string; total: number }>;
  investmentByType: Array<{ type: string; currency: string; total: number }>;
};

export type ReportJson = {
  title: string;
  generatedAt: string;
  executiveSummary: string[];
  kpis: Array<{ label: string; currency: string; value: number }>;
  tables: ReportTables;
  highlights: string[];
  risks: string[];
  recommendations: string[];
  nextSteps: string[];
};

export function extractJsonObjectString(raw: string): string | null {
  let t = raw.trim();
  const fence = /^```(?:json)?\s*\r?\n?([\s\S]*?)```/im.exec(t);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < t.length; i++) {
    const ch = t[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return t.slice(start, i + 1);
    }
  }
  return null;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}

function normalizeRowIncome(r: Record<string, unknown>) {
  return {
    source: str(r.source ?? r.key ?? r.name ?? ""),
    currency: str(r.currency ?? "INR").toUpperCase().slice(0, 3) || "INR",
    total: num(r.total ?? r.amount ?? r.value),
  };
}

function normalizeRowExpenseCat(r: Record<string, unknown>) {
  return {
    category: str(r.category ?? r.key ?? r.name ?? ""),
    currency: str(r.currency ?? "INR").toUpperCase().slice(0, 3) || "INR",
    total: num(r.total ?? r.amount ?? r.value),
  };
}

function normalizeRowMerchant(r: Record<string, unknown>) {
  return {
    merchant: str(r.merchant ?? r.key ?? r.name ?? ""),
    currency: str(r.currency ?? "INR").toUpperCase().slice(0, 3) || "INR",
    total: num(r.total ?? r.amount ?? r.value),
  };
}

function normalizeRowInvest(r: Record<string, unknown>) {
  return {
    type: str(r.type ?? r.key ?? r.name ?? ""),
    currency: str(r.currency ?? "INR").toUpperCase().slice(0, 3) || "INR",
    total: num(r.total ?? r.amount ?? r.value),
  };
}

function normalizeTables(t: unknown): ReportTables {
  const empty: ReportTables = {
    topIncomeSources: [],
    topExpenseCategories: [],
    topExpenseMerchants: [],
    investmentByType: [],
  };
  if (!t || typeof t !== "object") return empty;
  const o = t as Record<string, unknown>;
  const arr = (x: unknown) => (Array.isArray(x) ? x : []);

  empty.topIncomeSources = arr(o.topIncomeSources)
    .map((row) => normalizeRowIncome((row ?? {}) as Record<string, unknown>))
    .filter((r) => r.source || r.total > 0);
  empty.topExpenseCategories = arr(o.topExpenseCategories)
    .map((row) => normalizeRowExpenseCat((row ?? {}) as Record<string, unknown>))
    .filter((r) => r.category || r.total > 0);
  empty.topExpenseMerchants = arr(o.topExpenseMerchants)
    .map((row) => normalizeRowMerchant((row ?? {}) as Record<string, unknown>))
    .filter((r) => r.merchant || r.total > 0);
  empty.investmentByType = arr(o.investmentByType)
    .map((row) => normalizeRowInvest((row ?? {}) as Record<string, unknown>))
    .filter((r) => r.type || r.total > 0);

  return empty;
}

function normalizeKpis(arr: unknown): Array<{ label: string; currency: string; value: number }> {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((k) => {
      const o = (k ?? {}) as Record<string, unknown>;
      return {
        label: str(o.label ?? o.name ?? "KPI"),
        currency: str(o.currency ?? "INR").toUpperCase().slice(0, 3) || "INR",
        value: num(o.value),
      };
    })
    .filter((k) => k.label);
}

export function normalizeReportPayload(obj: unknown): ReportJson | null {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const o = obj as Record<string, unknown>;
  const title = str(o.title) || "Finance report";

  const executiveSummary = Array.isArray(o.executiveSummary)
    ? o.executiveSummary.map((x) => str(x)).filter(Boolean)
    : [];

  const kpis = normalizeKpis(o.kpis);
  const tables = normalizeTables(o.tables);

  const strArr = (k: string) =>
    Array.isArray(o[k]) ? (o[k] as unknown[]).map((x) => str(x)).filter(Boolean) : [];

  return {
    title,
    generatedAt: typeof o.generatedAt === "string" ? o.generatedAt : new Date().toISOString(),
    executiveSummary,
    kpis,
    tables,
    highlights: strArr("highlights"),
    risks: strArr("risks"),
    recommendations: strArr("recommendations"),
    nextSteps: strArr("nextSteps"),
  };
}

export function parseReportFromLlmText(raw: string): ReportJson | null {
  const jsonStr = extractJsonObjectString(raw);
  if (!jsonStr) return null;
  try {
    const parsed = JSON.parse(jsonStr) as unknown;
    return normalizeReportPayload(parsed);
  } catch {
    return null;
  }
}

export function reportFromTrackerStats(stats: TrackerStats): ReportJson {
  const currencies = new Set([
    ...Object.keys(stats.totals.incomeTotals),
    ...Object.keys(stats.totals.expenseTotals),
    ...Object.keys(stats.totals.investmentTotals),
    ...Object.keys(stats.totals.cashflowTotals),
  ]);
  if (currencies.size === 0) currencies.add("INR");

  const kpis: Array<{ label: string; currency: string; value: number }> = [];
  for (const c of currencies) {
    kpis.push({
      label: `Total income (${c})`,
      currency: c,
      value: stats.totals.incomeTotals[c] ?? 0,
    });
    kpis.push({
      label: `Total expense (${c})`,
      currency: c,
      value: stats.totals.expenseTotals[c] ?? 0,
    });
    kpis.push({
      label: `Cashflow (${c})`,
      currency: c,
      value: stats.totals.cashflowTotals[c] ?? 0,
    });
    kpis.push({
      label: `Investments (${c})`,
      currency: c,
      value: stats.totals.investmentTotals[c] ?? 0,
    });
  }

  return {
    title: "Tracker overview",
    generatedAt: new Date().toISOString(),
    executiveSummary: [
      `${stats.counts.incomeCount} income entries, ${stats.counts.expenseCount} expense entries, ${stats.counts.investmentCount} investment entries in this workspace.`,
      "Figures below are computed from your saved tracker data.",
    ],
    kpis,
    tables: {
      topIncomeSources: stats.tops.topIncomeSources.map((r) => ({
        source: r.key,
        currency: r.currency,
        total: r.total,
      })),
      topExpenseCategories: stats.tops.topExpenseCategories.map((r) => ({
        category: r.key,
        currency: r.currency,
        total: r.total,
      })),
      topExpenseMerchants: stats.tops.topExpenseMerchants.map((r) => ({
        merchant: r.key,
        currency: r.currency,
        total: r.total,
      })),
      investmentByType: stats.tops.investmentByType.map((r) => ({
        type: r.key,
        currency: r.currency,
        total: r.total,
      })),
    },
    highlights: [],
    risks: [],
    recommendations: [],
    nextSteps: [],
  };
}
