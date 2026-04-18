"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  ShoppingCart,
  Wallet,
  CreditCard,
  PiggyBank,
  Plus,
  RefreshCw,
  Clock,
  LayoutDashboard,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { IncomeEntry } from "@/types/income";
import type { ExpenseEntry } from "@/types/expense";
import type { InvestmentEntry } from "@/types/investment";
import type { WorkspaceKind } from "@/types/workspace";
import { setActiveWorkspaceKindAction } from "@/app/actions/workspace";

/* ═══════════════════════════════════════════════════
   Animations
   ═══════════════════════════════════════════════════ */

const ease = [0.16, 1, 0.3, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease },
  },
};

/* ═══════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════ */

function formatCurrency(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(d);
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ═══════════════════════════════════════════════════
   Chart Tooltip
   ═══════════════════════════════════════════════════ */

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-popover/95 backdrop-blur-xl border border-border shadow-2xl p-3 text-xs space-y-1.5">
      <p className="font-bold text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-bold ml-auto tabular-nums">
            {formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   KPI Card Component
   ═══════════════════════════════════════════════════ */

function KpiCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string;
  change: string;
  changeType: "up" | "down" | "neutral";
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="group relative rounded-2xl glass-dashboard card-hover-glow gradient-border p-5 sm:p-6 overflow-hidden"
    >
      {/* Background glow */}
      <div className={`absolute top-0 right-0 w-28 h-28 ${iconBg} rounded-full blur-[40px] opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
            changeType === "up" ? "bg-emerald-500/10 text-emerald-500" :
            changeType === "down" ? "bg-rose-500/10 text-rose-500" :
            "bg-muted text-muted-foreground"
          }`}>
            {changeType === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> :
             changeType === "down" ? <ArrowDownRight className="h-3.5 w-3.5" /> : null}
            {change}
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-foreground mb-1">
          {value}
        </div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   Activity Item
   ═══════════════════════════════════════════════════ */

type ActivityEvent = {
  id: string;
  type: "income" | "expense" | "investment";
  title: string;
  subtitle: string;
  amount: string;
  timestamp: string;
};

function ActivityItem({ event, index }: { event: ActivityEvent; index: number }) {
  const iconMap = {
    income: { icon: TrendingUp, bg: "bg-emerald-500/10", color: "text-emerald-500" },
    expense: { icon: CreditCard, bg: "bg-rose-500/10", color: "text-rose-500" },
    investment: { icon: PiggyBank, bg: "bg-violet-500/10", color: "text-violet-500" },
  };
  const { icon: Icon, bg, color } = iconMap[event.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease }}
      className="timeline-connector flex items-start gap-3 py-3 group"
    >
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground truncate">{event.title}</span>
          <span className="text-xs font-bold tabular-nums text-foreground/80 shrink-0">{event.amount}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-muted-foreground truncate">{event.subtitle}</span>
          <span className="text-[10px] text-muted-foreground/70 shrink-0">{event.timestamp}</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════ */

export function TrackerDashboardPage({
  workspaceSubtitle,
  workspaceKind,
}: {
  workspaceSubtitle?: string;
  workspaceKind?: WorkspaceKind;
}) {
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState<IncomeEntry[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [investments, setInvestments] = useState<InvestmentEntry[]>([]);
  const [timeFilter, setTimeFilter] = useState<"week" | "month" | "year">("month");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [incomeRes, expenseRes, investRes] = await Promise.all([
        fetch("/api/tracker/income?limit=50"),
        fetch("/api/tracker/expense?limit=50"),
        fetch("/api/tracker/invest?limit=50"),
      ]);

      if (!incomeRes.ok || !expenseRes.ok || !investRes.ok) {
        throw new Error("Failed to load data from one or more endpoints");
      }

      const [incomeJson, expenseJson, investJson] = await Promise.all([
        incomeRes.json(),
        expenseRes.json(),
        investRes.json(),
      ]);

      // API returns { data: [...], nextCursor, hasMore }
      setIncome(incomeJson.data ?? []);
      setExpenses(expenseJson.data ?? []);
      setInvestments(investJson.data ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load dashboard";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!workspaceKind) return;
    void setActiveWorkspaceKindAction(workspaceKind);
  }, [workspaceKind]);

  /* ── Derived Data ── */

  const totals = useMemo(() => {
    const currency = income[0]?.currency ?? expenses[0]?.currency ?? "INR";
    const totalIncome = income.reduce((s, e) => s + (e.amount ?? 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
    const totalInvestments = investments.reduce((s, e) => s + (e.amount ?? 0), 0);
    return {
      income: totalIncome,
      expenses: totalExpenses,
      investments: totalInvestments,
      net: totalIncome - totalExpenses,
      currency,
    };
  }, [income, expenses, investments]);


  // Chart data — monthly aggregation
  const chartData = useMemo(() => {
    const months: Record<string, { income: number; expenses: number }> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (const item of income) {
      const d = new Date(item.receivedAt);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (!months[key]) months[key] = { income: 0, expenses: 0 };
      months[key].income += item.amount;
    }
    for (const item of expenses) {
      const d = new Date(item.spentAt);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (!months[key]) months[key] = { income: 0, expenses: 0 };
      months[key].expenses += item.amount;
    }

    return Object.entries(months)
      .map(([name, vals]) => ({ name: name.split(" ")[0], Income: vals.income, Expenses: vals.expenses }))
      .slice(-6);
  }, [income, expenses]);

  // Category breakdown for expenses
  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    for (const item of expenses) {
      const key = (item.category || "other").replace(/_/g, " ");
      cats[key] = (cats[key] ?? 0) + item.amount;
    }
    return Object.entries(cats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, amount]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), amount }));
  }, [expenses]);

  // Recent activity feed — merge all entries sorted by date
  const activityFeed = useMemo((): ActivityEvent[] => {
    const events: ActivityEvent[] = [];

    for (const item of income.slice(0, 5)) {
      events.push({
        id: item.id || (item as unknown as Record<string, unknown>)._id as string || `inc-${Math.random()}`,
        type: "income",
        title: "Payment received",
        subtitle: item.source || item.category || "Income",
        amount: `+${formatCurrency(item.amount, item.currency)}`,
        timestamp: timeAgo(item.receivedAt || item.created_at),
      });
    }
    for (const item of expenses.slice(0, 5)) {
      events.push({
        id: item.id || (item as unknown as Record<string, unknown>)._id as string || `exp-${Math.random()}`,
        type: "expense",
        title: "Expense added",
        subtitle: item.merchant || item.category || "Expense",
        amount: `-${formatCurrency(item.amount, item.currency)}`,
        timestamp: timeAgo(item.spentAt || item.created_at),
      });
    }
    for (const item of investments.slice(0, 3)) {
      events.push({
        id: item.id || (item as unknown as Record<string, unknown>)._id as string || `inv-${Math.random()}`,
        type: "investment",
        title: "Investment made",
        subtitle: item.assetName || item.type || "Investment",
        amount: formatCurrency(item.amount, item.currency),
        timestamp: timeAgo(item.investedAt || item.created_at),
      });
    }

    return events.slice(0, 8);
  }, [income, expenses, investments]);

  // Recent transactions (combined, sorted by date)
  const recentTransactions = useMemo(() => {
    type Transaction = {
      id: string;
      date: string;
      description: string;
      category: string;
      amount: number;
      currency: string;
      type: "income" | "expense";
    };

    const txns: Transaction[] = [];

    for (const item of income.slice(0, 5)) {
      txns.push({
        id: item.id || (item as unknown as Record<string, unknown>)._id as string || `inc-${Math.random()}`,
        date: item.receivedAt || item.created_at,
        description: item.source || "Income",
        category: item.category || "other",
        amount: item.amount,
        currency: item.currency || "INR",
        type: "income",
      });
    }
    for (const item of expenses.slice(0, 5)) {
      txns.push({
        id: item.id || (item as unknown as Record<string, unknown>)._id as string || `exp-${Math.random()}`,
        date: item.spentAt || item.created_at,
        description: item.merchant || "Expense",
        category: item.category || "other",
        amount: item.amount,
        currency: item.currency || "INR",
        type: "expense",
      });
    }

    return txns
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);
  }, [income, expenses]);

  /* ── Greeting ── */
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const hasAnyData = income.length > 0 || expenses.length > 0 || investments.length > 0;

  /* ── Render ── */

  if (loading) {
    return (
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pb-12 pt-4"
      >
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <div className="flex items-end justify-between px-1">
            <div className="space-y-2">
              <div className="h-8 w-48 animate-pulse rounded-xl bg-muted/50" />
              <div className="h-4 w-64 animate-pulse rounded-lg bg-muted/30" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted/30 border border-border/20" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-80 animate-pulse rounded-2xl bg-muted/20 border border-border/20" />
            <div className="h-80 animate-pulse rounded-2xl bg-muted/20 border border-border/20" />
          </div>
        </div>
      </motion.main>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="pb-12 pt-2"
    >
      <div className="mx-auto w-full max-w-6xl space-y-6 sm:space-y-8">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {greeting} 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Here&apos;s what&apos;s happening with your finances today.
              {workspaceSubtitle ? (
                <span className="block mt-1 text-xs font-medium text-primary/90">
                  {workspaceSubtitle}
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadDashboard()}
              disabled={loading}
              className="rounded-xl border-border/60 gap-2 text-muted-foreground hover:text-foreground shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              asChild
              size="sm"
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-md"
            >
              <Link href="/tracker/income">
                <Plus className="h-3.5 w-3.5" />
                Add Entry
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* ── KPI Cards ── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          <KpiCard
            title="Total Income"
            value={formatCurrency(totals.income, totals.currency)}
            change={`${income.length} entries`}
            changeType={totals.income > 0 ? "up" : "neutral"}
            icon={DollarSign}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-500"
          />
          <KpiCard
            title="Total Expenses"
            value={formatCurrency(totals.expenses, totals.currency)}
            change={`${expenses.length} entries`}
            changeType={expenses.length > 0 ? "down" : "neutral"}
            icon={CreditCard}
            iconBg="bg-rose-500/10"
            iconColor="text-rose-500"
          />
          <KpiCard
            title="Net Balance"
            value={formatCurrency(totals.net, totals.currency)}
            change={totals.net >= 0 ? "Positive" : "Negative"}
            changeType={totals.net >= 0 ? "up" : "down"}
            icon={Activity}
            iconBg="bg-blue-500/10"
            iconColor="text-blue-500"
          />
          <KpiCard
            title="Investments"
            value={formatCurrency(totals.investments, totals.currency)}
            change={`${investments.length} entries`}
            changeType={investments.length > 0 ? "up" : "neutral"}
            icon={PiggyBank}
            iconBg="bg-violet-500/10"
            iconColor="text-violet-500"
          />
        </motion.div>

        {/* ── Empty State ── */}
        {!hasAnyData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl glass-dashboard p-10 sm:p-14 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <LayoutDashboard className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">No data yet</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Start by adding your first income or expense entry. Your dashboard will automatically populate with charts, analytics, and insights.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <Link href="/tracker/income">
                  <TrendingUp className="h-4 w-4" />
                  Add Income
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl gap-2">
                <Link href="/tracker/expense">
                  <TrendingDown className="h-4 w-4" />
                  Add Expense
                </Link>
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Charts Row ── */}
        {hasAnyData && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            {/* Revenue vs Expenses Chart */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-2 rounded-2xl glass-dashboard p-5 sm:p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/80">Income vs Expenses</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Monthly comparison</p>
                </div>
                <div className="flex rounded-xl bg-muted/40 p-1">
                  {(["week", "month", "year"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeFilter(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        timeFilter === t
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-60 gap-3 text-muted-foreground">
                  <LayoutDashboard className="h-8 w-8 opacity-30" />
                  <p className="text-sm">Add entries to see chart data</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.2} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                    />
                    <ReTooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="Income"
                      stroke="#22c55e"
                      strokeWidth={2.5}
                      fill="url(#gradIncome)"
                      dot={{ r: 4, fill: "#22c55e", stroke: "var(--color-card)", strokeWidth: 2 }}
                      activeDot={{ r: 6, stroke: "#22c55e", strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Expenses"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      fill="url(#gradExpenses)"
                      dot={{ r: 4, fill: "#ef4444", stroke: "var(--color-card)", strokeWidth: 2 }}
                      activeDot={{ r: 6, stroke: "#ef4444", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* Expense Breakdown */}
            <motion.div variants={itemVariants} className="rounded-2xl glass-dashboard p-5 sm:p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-1">
                Expense Breakdown
              </h2>
              <p className="text-xs text-muted-foreground mb-5">Top categories</p>

              {categoryData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-52 gap-3 text-muted-foreground">
                  <Wallet className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No expense data</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={categoryData} layout="vertical" barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.15} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
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
                      width={80}
                    />
                    <ReTooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="amount"
                      name="Amount"
                      fill="url(#barGrad)"
                      radius={[0, 8, 8, 0]}
                    />
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8B6BFF" />
                        <stop offset="100%" stopColor="#00E5BB" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* ── Transactions + Activity Row ── */}
        {hasAnyData && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 lg:grid-cols-5 gap-4"
          >
            {/* Recent Transactions Table */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-3 rounded-2xl glass-dashboard overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border/30">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/80">Recent Transactions</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Latest activity</p>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <Link href="/tracker/income">View all →</Link>
                </Button>
              </div>

              {recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No transactions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border/20">
                  {recentTransactions.map((tx, i) => (
                    <motion.div
                      key={tx.id + i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.3, ease }}
                      className="flex items-center justify-between px-5 sm:px-6 py-3.5 hover:bg-muted/10 transition-colors group cursor-default"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          tx.type === "income" ? "bg-emerald-500/10" : "bg-rose-500/10"
                        }`}>
                          {tx.type === "income" ? (
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-rose-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">{tx.description}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] capitalize bg-muted px-2 py-0.5 rounded-md font-medium text-foreground/70">
                              {tx.category.replace(/_/g, " ")}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{formatDate(tx.date)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-sm font-bold tabular-nums ${
                          tx.type === "income" ? "text-emerald-500" : "text-foreground"
                        }`}>
                          {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount, tx.currency)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Activity Feed */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-2 rounded-2xl glass-dashboard p-5 sm:p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/80">Activity</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Recent events</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
              </div>

              {activityFeed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Activity className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {activityFeed.map((event, i) => (
                    <ActivityItem key={event.id + i} event={event} index={i} />
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* ── Quick Actions Footer ── */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="rounded-2xl glass-dashboard p-5 sm:p-6"
        >
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: "/tracker/income", label: "Add Income", icon: TrendingUp, bg: "bg-emerald-500/10", color: "text-emerald-500" },
              { href: "/tracker/expense", label: "Add Expense", icon: CreditCard, bg: "bg-rose-500/10", color: "text-rose-500" },
              { href: "/tracker/invest", label: "Add Investment", icon: PiggyBank, bg: "bg-violet-500/10", color: "text-violet-500" },
              { href: "/tracker/report", label: "View Reports", icon: FileText, bg: "bg-blue-500/10", color: "text-blue-500" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-xl border border-border/30 bg-card/30 p-4 hover:bg-muted/20 transition-all duration-300 group card-hover-glow"
              >
                <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                </div>
                <span className="text-sm font-semibold text-foreground">{action.label}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.main>
  );
}
