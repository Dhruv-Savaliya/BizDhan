"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  RefreshCw,
  Activity,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Wallet,
  TrendingDown,
  ChevronDown,
  ShieldAlert,
  Clock,
  Hash,
  Inbox,
  ServerCrash,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { TrackerStats } from "@/lib/report";
import type {
  CashRunwayInsight,
  ExpenseLeak,
  FinancialHealthScore,
  OverdueItem,
} from "@/lib/summary-insights";

/* ═══════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════ */

type SummaryPayload = {
  stats: TrackerStats;
  generatedAt: string;
  primaryCurrency: string;
  cashRunway: CashRunwayInsight;
  financialHealth: FinancialHealthScore;
  expenseLeaks: ExpenseLeak[];
  overdueInvoices: OverdueItem[];
};

/* ═══════════════════════════════════════════════════
   Animations
   ═══════════════════════════════════════════════════ */

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/* ═══════════════════════════════════════════════════
   SVG Progress Ring
   ═══════════════════════════════════════════════════ */

function ProgressRing({
  score,
  size = 120,
  strokeWidth = 10,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let strokeColor = "#22c55e"; // green
  if (score < 40) strokeColor = "#ef4444"; // red
  else if (score < 70) strokeColor = "#f59e0b"; // amber

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black tabular-nums tracking-tight text-foreground">
          {score}
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          / 100
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Reusable states
   ═══════════════════════════════════════════════════ */

function SkeletonCard() {
  return (
    <div className="h-36 animate-pulse rounded-2xl bg-muted/40 border border-border/30" />
  );
}

function SkeletonRow() {
  return (
    <div className="h-14 animate-pulse rounded-xl bg-muted/30 border border-border/20" />
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center justify-center py-20 gap-4"
    >
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <ServerCrash className="h-8 w-8 text-destructive" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-foreground">Failed to load summary</h2>
        <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      </div>
      <Button
        onClick={onRetry}
        variant="outline"
        className="rounded-xl gap-2 mt-2"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </Button>
    </motion.div>
  );
}

function EmptySection({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2">
      <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center">
        <Icon className="h-5 w-5 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/70">{subtitle}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Collapsible Section Card
   ═══════════════════════════════════════════════════ */

function CollapsibleSection({
  icon: Icon,
  iconColor,
  title,
  badge,
  defaultOpen = true,
  children,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="rounded-2xl border-border/40 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-muted/20 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${iconColor} flex items-center justify-center`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <span className="text-sm font-bold uppercase tracking-wider text-foreground/80">
                {title}
              </span>
              {badge}
            </div>
            <motion.div
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.25 }}
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
                className="overflow-hidden"
              >
                <div className="border-t border-border/40 px-1 pb-1">
                  {children}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/* ═══════════════════════════════════════════════════
   Chart tooltip
   ═══════════════════════════════════════════════════ */

function ChartTooltip({ active, payload, label, currency }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-popover border border-border shadow-lg p-3 text-xs space-y-1.5">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-bold ml-auto tabular-nums">
            {currency} {p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════ */

export default function SummaryPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SummaryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tracker/summary", { method: "GET" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load summary");
      setData({
        stats: json.stats as TrackerStats,
        generatedAt: String(json.generatedAt ?? ""),
        primaryCurrency: String(json.primaryCurrency ?? "INR"),
        cashRunway: json.cashRunway as CashRunwayInsight,
        financialHealth: json.financialHealth as FinancialHealthScore,
        expenseLeaks: (json.expenseLeaks ?? []) as ExpenseLeak[],
        overdueInvoices: (json.overdueInvoices ?? []) as OverdueItem[],
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load summary";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  /* ── Derived data ── */
  const primaryCurrency = data?.primaryCurrency ?? "INR";

  const leaksTotalAmount = useMemo(
    () => (data?.expenseLeaks ?? []).reduce((s, l) => s + l.amount, 0),
    [data?.expenseLeaks]
  );

  const chartData = useMemo(() => {
    if (!data?.stats) return [];
    const cats = data.stats.tops.topExpenseCategories;
    const sources = data.stats.tops.topIncomeSources;

    // Build an income-vs-expense comparison by top categories
    const categorySet = new Set<string>();
    for (const c of cats) categorySet.add(c.key);
    for (const s of sources) categorySet.add(s.key);

    // Simpler approach: monthly-ish comparison between income and expense totals
    const inc = data.stats.totals.incomeTotals[primaryCurrency] ?? 0;
    const exp = data.stats.totals.expenseTotals[primaryCurrency] ?? 0;
    const inv = data.stats.totals.investmentTotals[primaryCurrency] ?? 0;

    return [
      { name: "Income", Income: inc, Expense: 0, Investment: 0 },
      { name: "Expense", Income: 0, Expense: exp, Investment: 0 },
      { name: "Investment", Income: 0, Expense: 0, Investment: inv },
    ];
  }, [data?.stats, primaryCurrency]);

  // Category breakdown for chart
  const categoryChartData = useMemo(() => {
    if (!data?.stats) return [];
    return data.stats.tops.topExpenseCategories
      .filter((c) => c.currency === primaryCurrency)
      .slice(0, 6)
      .map((c) => ({
        name: c.key.replace(/_/g, " "),
        amount: c.total,
      }));
  }, [data?.stats, primaryCurrency]);

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="pb-12 pt-2"
    >
      <div className="mx-auto w-full max-w-5xl space-y-8">

        {/* ── Page Header ── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="flex items-end justify-between gap-4 px-1"
        >
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Business Summary
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Financial health, cash runway, and actionable insights.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-xl border-border/60 gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </motion.div>

        {/* ── Error State ── */}
        {!loading && error && !data && (
          <ErrorState message={error} onRetry={() => void load()} />
        )}

        {/* ── Loading State ── */}
        {loading && !data && (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <motion.div key={i} variants={itemVariants}><SkeletonCard /></motion.div>
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <motion.div key={i} variants={itemVariants}>
                  <div className="rounded-2xl border border-border/30 bg-muted/10 p-4 space-y-3">
                    <div className="h-10 animate-pulse rounded-xl bg-muted/40" />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Data View ── */}
        {data && (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">

            {/* ── Top Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Financial Health Score */}
              <motion.div
                variants={itemVariants}
                className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:shadow-lg transition-all duration-300 col-span-2 sm:col-span-1"
              >
                <div className="flex flex-col items-center gap-3">
                  <ProgressRing score={data.financialHealth.score} size={110} strokeWidth={9} />
                  <div className="text-center">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] uppercase font-bold tracking-wider ${
                        data.financialHealth.score >= 70
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : data.financialHealth.score >= 40
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {data.financialHealth.label}
                    </Badge>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-2">
                      Health Score
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Cash Runway */}
              <motion.div
                variants={itemVariants}
                className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-emerald-500" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Cash Runway
                  </span>
                </div>
                <div className="text-2xl font-black tabular-nums tracking-tight text-foreground">
                  {data.cashRunway.runwayMonths != null
                    ? data.cashRunway.runwayMonths === 0
                      ? "0 days"
                      : `${Math.round(data.cashRunway.runwayMonths * 30)}d`
                    : "—"}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {data.cashRunway.runwayMonths != null
                    ? `~${data.cashRunway.runwayMonths} months at current burn`
                    : "Need more data"}
                </p>
              </motion.div>

              {/* Spending Leaks */}
              <motion.div
                variants={itemVariants}
                className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:border-rose-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/5"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                    <ShieldAlert className="h-4 w-4 text-rose-500" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Spending Leaks
                  </span>
                </div>
                <div className="text-2xl font-black tabular-nums tracking-tight text-rose-600 dark:text-rose-400">
                  {data.expenseLeaks.length > 0
                    ? `${primaryCurrency} ${leaksTotalAmount.toLocaleString()}`
                    : "None"}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {data.expenseLeaks.length} concentration flag{data.expenseLeaks.length !== 1 ? "s" : ""}
                </p>
              </motion.div>

              {/* Overdue Invoices */}
              <motion.div
                variants={itemVariants}
                className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Overdue
                  </span>
                </div>
                <div className="text-2xl font-black tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
                  {data.overdueInvoices.length}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  invoice{data.overdueInvoices.length !== 1 ? "s" : ""} past due
                </p>
              </motion.div>
            </div>

            {/* ── Breakdown Sections ── */}

            {/* Health Score Breakdown */}
            <motion.div variants={itemVariants}>
              <CollapsibleSection
                icon={Activity}
                iconColor="bg-primary/10 text-primary"
                title="Health Score Breakdown"
                badge={
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-muted ml-2">
                    {data.financialHealth.score}/100
                  </Badge>
                }
              >
                <div className="px-4 sm:px-5 py-4 space-y-3">
                  {data.financialHealth.breakdown.map((b) => (
                    <div key={b.key} className="flex items-center justify-between gap-4 py-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-primary/50 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-foreground">{b.label}</span>
                          <p className="text-[11px] text-muted-foreground truncate">{b.note}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold tabular-nums">{b.value}</span>
                        <span className="text-xs text-muted-foreground">/ {b.weight}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            </motion.div>

            {/* Spending Leaks Breakdown */}
            <motion.div variants={itemVariants}>
              <CollapsibleSection
                icon={ShieldAlert}
                iconColor="bg-rose-500/10 text-rose-500"
                title="Spending Leaks"
                badge={
                  data.expenseLeaks.length > 0 ? (
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-rose-500/10 text-rose-500 ml-2">
                      {data.expenseLeaks.length} flag{data.expenseLeaks.length !== 1 ? "s" : ""}
                    </Badge>
                  ) : undefined
                }
              >
                {data.expenseLeaks.length === 0 ? (
                  <EmptySection
                    icon={TrendingDown}
                    title="Spending is healthy"
                    subtitle="No major concentration flags found."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[11px] text-muted-foreground uppercase bg-muted/20 border-b border-border/30">
                        <tr>
                          <th className="px-4 sm:px-5 py-3 font-semibold">Category</th>
                          <th className="px-4 sm:px-5 py-3 font-semibold text-right">Amount</th>
                          <th className="px-4 sm:px-5 py-3 font-semibold text-right">Share</th>
                          <th className="px-4 sm:px-5 py-3 font-semibold text-center">Severity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {data.expenseLeaks.map((row, i) => (
                          <tr key={`${row.kind}-${row.name}-${i}`} className="hover:bg-muted/10 transition-colors">
                            <td className="px-4 sm:px-5 py-3">
                              <div className="font-medium text-foreground capitalize">{row.name.replace(/_/g, " ")}</div>
                              <div className="text-[10px] text-muted-foreground uppercase">{row.kind}</div>
                            </td>
                            <td className="px-4 sm:px-5 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                              <span className="text-xs text-muted-foreground mr-1">{row.currency}</span>
                              {row.amount.toLocaleString()}
                            </td>
                            <td className="px-4 sm:px-5 py-3 text-right">
                              <span className="font-semibold tabular-nums">{row.sharePercent}%</span>
                            </td>
                            <td className="px-4 sm:px-5 py-3 text-center">
                              <Badge
                                variant="secondary"
                                className={`text-[10px] uppercase font-bold tracking-wider rounded-md ${
                                  row.severity === "high"
                                    ? "bg-destructive/10 text-destructive"
                                    : row.severity === "medium"
                                      ? "bg-amber-500/10 text-amber-500"
                                      : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {row.severity}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CollapsibleSection>
            </motion.div>

            {/* Overdue Invoices */}
            <motion.div variants={itemVariants}>
              <CollapsibleSection
                icon={Receipt}
                iconColor="bg-amber-500/10 text-amber-500"
                title="Overdue Invoices"
                badge={
                  data.overdueInvoices.length > 0 ? (
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 text-amber-500 ml-2">
                      {data.overdueInvoices.length}
                    </Badge>
                  ) : undefined
                }
              >
                {data.overdueInvoices.length === 0 ? (
                  <EmptySection
                    icon={Receipt}
                    title="All caught up"
                    subtitle="No overdue invoices found."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[11px] text-muted-foreground uppercase bg-muted/20 border-b border-border/30">
                        <tr>
                          <th className="px-4 sm:px-5 py-3 font-semibold">Client</th>
                          <th className="px-4 sm:px-5 py-3 font-semibold text-right">Amount</th>
                          <th className="px-4 sm:px-5 py-3 font-semibold text-center">Days Overdue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {data.overdueInvoices.map((row) => (
                          <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-4 sm:px-5 py-3">
                              <div className="font-medium text-foreground">{row.partyName}</div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                {row.invoiceNumber}
                              </div>
                            </td>
                            <td className="px-4 sm:px-5 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                              <span className="text-xs text-muted-foreground mr-1">{row.currency}</span>
                              {row.amount.toLocaleString()}
                            </td>
                            <td className="px-4 sm:px-5 py-3 text-center">
                              <Badge
                                variant="secondary"
                                className={`text-[10px] uppercase font-bold tracking-wider tabular-nums ${
                                  row.daysPastDue > 30
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {row.daysPastDue}d late
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CollapsibleSection>
            </motion.div>

            {/* Income vs Expense Chart */}
            <motion.div variants={itemVariants}>
              <CollapsibleSection
                icon={TrendingUp}
                iconColor="bg-blue-500/10 text-blue-500"
                title="Income vs Expense"
                badge={
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-muted ml-2">
                    {primaryCurrency}
                  </Badge>
                }
              >
                {chartData.every((d) => d.Income === 0 && d.Expense === 0 && d.Investment === 0) ? (
                  <EmptySection
                    icon={Inbox}
                    title="No financial data yet"
                    subtitle="Add income and expense entries to see the chart."
                  />
                ) : (
                  <div className="px-2 sm:px-4 py-6">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={chartData} barCategoryGap="20%" barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12, fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                        />
                        <ReTooltip content={<ChartTooltip currency={primaryCurrency} />} />
                        <Legend
                          wrapperStyle={{ fontSize: 12, fontWeight: 600 }}
                        />
                        <Bar dataKey="Income" fill="#22c55e" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Expense" fill="#ef4444" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Investment" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Category breakdown chart */}
                    {categoryChartData.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-border/30">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 px-2">
                          Top Expense Categories
                        </h3>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={categoryChartData} layout="vertical" barCategoryGap="15%">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} horizontal={false} />
                            <XAxis
                              type="number"
                              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontWeight: 500 }}
                              axisLine={false}
                              tickLine={false}
                              width={90}
                            />
                            <ReTooltip content={<ChartTooltip currency={primaryCurrency} />} />
                            <Bar dataKey="amount" name="Amount" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}
              </CollapsibleSection>
            </motion.div>

            {/* Cash Runway Detail */}
            <motion.div variants={itemVariants}>
              <CollapsibleSection
                icon={Wallet}
                iconColor="bg-emerald-500/10 text-emerald-500"
                title="Cash Runway Detail"
                defaultOpen={false}
              >
                <div className="px-4 sm:px-5 py-5">
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                    {data.cashRunway.detail}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-muted/30 rounded-xl p-3.5 border border-border/20">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        30D Income
                      </div>
                      <div className="font-bold text-foreground tabular-nums">
                        <span className="text-xs text-muted-foreground mr-1">{data.cashRunway.currency}</span>
                        {data.cashRunway.income30d.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-3.5 border border-border/20">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">
                        <TrendingDown className="w-3 h-3 text-destructive" />
                        30D Expense
                      </div>
                      <div className="font-bold text-foreground tabular-nums">
                        <span className="text-xs text-muted-foreground mr-1">{data.cashRunway.currency}</span>
                        {data.cashRunway.expense30d.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-3.5 border border-border/20">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">
                        <Activity className="w-3 h-3 text-blue-500" />
                        30D Net
                      </div>
                      <div className={`font-bold tabular-nums ${data.cashRunway.net30d >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                        <span className="text-xs text-muted-foreground mr-1">{data.cashRunway.currency}</span>
                        {data.cashRunway.net30d > 0 ? "+" : ""}{data.cashRunway.net30d.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-3.5 border border-border/20">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">
                        <Wallet className="w-3 h-3 text-primary" />
                        All-Time Net
                      </div>
                      <div className={`font-bold tabular-nums ${data.cashRunway.cumulativeNet >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                        <span className="text-xs text-muted-foreground mr-1">{data.cashRunway.currency}</span>
                        {data.cashRunway.cumulativeNet > 0 ? "+" : ""}{data.cashRunway.cumulativeNet.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            </motion.div>

            {/* Portfolio Stats */}
            <motion.div variants={itemVariants}>
              <CollapsibleSection
                icon={Hash}
                iconColor="bg-violet-500/10 text-violet-500"
                title="Portfolio Stats"
                defaultOpen={false}
              >
                <div className="px-4 sm:px-5 py-5">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted/30 rounded-xl p-4 border border-border/20 text-center">
                      <div className="text-3xl font-black tabular-nums text-foreground">
                        {data.stats.counts.incomeCount}
                      </div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                        Income
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4 border border-border/20 text-center">
                      <div className="text-3xl font-black tabular-nums text-foreground">
                        {data.stats.counts.expenseCount}
                      </div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                        Expense
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4 border border-border/20 text-center">
                      <div className="text-3xl font-black tabular-nums text-foreground">
                        {data.stats.counts.investmentCount}
                      </div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                        Investment
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            </motion.div>

          </motion.div>
        )}
      </div>
    </motion.main>
  );
}
