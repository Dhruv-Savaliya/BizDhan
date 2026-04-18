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
  Wallet,
  CreditCard,
  PiggyBank,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { IncomeEntry } from "@/types/income";
import type { ExpenseEntry } from "@/types/expense";
import type { InvestmentEntry } from "@/types/investment";
import type { InvoiceEntry } from "@/types/invoice";
import type { PurchaseEntry } from "@/types/purchase";
import type { WorkspaceKind } from "@/types/workspace";
import { setActiveWorkspaceKindAction } from "@/app/actions/workspace";

/* ═══════════════════════════════════════════════════
   Animations
   ═══════════════════════════════════════════════════ */

const ease = [0.16, 1, 0.3, 1] as const;

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
  workspaceKind = "personal",
}: {
  workspaceSubtitle?: string;
  workspaceKind?: WorkspaceKind;
}) {
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState<IncomeEntry[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [investments, setInvestments] = useState<InvestmentEntry[]>([]);
  const [invoices, setInvoices] = useState<InvoiceEntry[]>([]);
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);

  const isSme = workspaceKind === "sme";

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const endpoints = [
        fetch("/api/tracker/income?limit=50"),
        fetch("/api/tracker/expense?limit=50"),
      ];

      if (isSme) {
        endpoints.push(fetch("/api/tracker/invoice?limit=50"));
        endpoints.push(fetch("/api/tracker/purchase?limit=50"));
      } else {
        endpoints.push(fetch("/api/tracker/invest?limit=50"));
      }

      const responses = await Promise.all(endpoints);
      const data = await Promise.all(responses.map((r) => r.json()));

      setIncome(data[0].data ?? []);
      setExpenses(data[1].data ?? []);

      if (isSme) {
        setInvoices(data[2].data ?? []);
        setPurchases(data[3].data ?? []);
      } else {
        setInvestments(data[2].data ?? []);
      }
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [isSme]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!workspaceKind) return;
    void setActiveWorkspaceKindAction(workspaceKind);
  }, [workspaceKind]);

  const stats = useMemo(() => {
    const currency = income[0]?.currency || "INR";
    const totalIncome = income.reduce((s, e) => s + (e.amount || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    if (isSme) {
      const totalPurchases = purchases.reduce((s, e) => s + (e.amount || 0), 0);
      const netProfit = totalIncome - totalExpenses - totalPurchases;
      const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      return {
        primary: {
          label: "Gross Revenue",
          value: totalIncome,
          icon: DollarSign,
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
        },
        secondary: {
          label: "Operating Costs",
          value: totalExpenses + totalPurchases,
          icon: TrendingDown,
          color: "text-rose-500",
          bg: "bg-rose-500/10",
        },
        tertiary: {
          label: "Net Profit",
          value: netProfit,
          icon: Activity,
          color: "text-indigo-500",
          bg: "bg-indigo-500/10",
        },
        quaternary: {
          label: "Profit Margin",
          value: `${margin.toFixed(1)}%`,
          isRaw: true,
          icon: TrendingUp,
          color: "text-amber-500",
          bg: "bg-amber-500/10",
        },
        currency,
      };
    } else {
      const netSavings = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

      return {
        primary: {
          label: "Total Income",
          value: totalIncome,
          icon: Wallet,
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
        },
        secondary: {
          label: "Total Expenses",
          value: totalExpenses,
          icon: CreditCard,
          color: "text-rose-500",
          bg: "bg-rose-500/10",
        },
        tertiary: {
          label: "Net Savings",
          value: netSavings,
          icon: PiggyBank,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        },
        quaternary: {
          label: "Savings Rate",
          value: `${savingsRate.toFixed(1)}%`,
          isRaw: true,
          icon: Activity,
          color: "text-violet-500",
          bg: "bg-violet-500/10",
        },
        currency,
      };
    }
  }, [income, expenses, purchases, isSme]);

  // Combined chart data
  const chartData = useMemo(() => {
    const months: Record<string, { income: number; expenses: number; other: number }> = {};
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const process = (items: readonly object[], dateKey: string, valKey: string, type: "income" | "expenses" | "other") => {
      for (const item of items) {
        const row = item as Record<string, unknown>;
        const d = new Date((row[dateKey] as string) || (row.created_at as string));
        if (isNaN(d.getTime())) continue;
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        if (!months[key]) months[key] = { income: 0, expenses: 0, other: 0 };
        months[key][type] += (row[valKey] as number) || 0;
      }
    };

    process(income, "receivedAt", "amount", "income");
    process(expenses, "spentAt", "amount", "expenses");
    if (isSme) {
      process(purchases, "purchasedAt", "amount", "other"); // Purchases count as cost
    } else {
      process(investments, "investedAt", "amount", "other"); // Investments count as growth
    }

    return Object.entries(months)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([name, vals]) => ({
        name: name.split(" ")[0],
        Primary: vals.income,
        Secondary: isSme ? vals.expenses + vals.other : vals.expenses,
        Tertiary: isSme ? vals.income - (vals.expenses + vals.other) : vals.other,
      }))
      .slice(-6);
  }, [isSme, income, expenses, investments, purchases]);

  const activityFeed = useMemo((): ActivityEvent[] => {
    const events: ActivityEvent[] = [];

    income.slice(0, 3).forEach((item) =>
      events.push({
        id: `inc-${item.id}`,
        type: "income",
        title: isSme ? "Client Payment" : "Income Received",
        subtitle: item.source || "General",
        amount: `+${formatCurrency(item.amount, item.currency)}`,
        timestamp: timeAgo(item.receivedAt),
      })
    );

    expenses.slice(0, 3).forEach((item) =>
      events.push({
        id: `exp-${item.id}`,
        type: "expense",
        title: "Expense Recorded",
        subtitle: item.merchant || item.category || "General",
        amount: `-${formatCurrency(item.amount, item.currency)}`,
        timestamp: timeAgo(item.spentAt),
      })
    );

    if (isSme) {
      invoices.slice(0, 2).forEach((item) =>
        events.push({
          id: `inv-${item.id}`,
          type: "income",
          title: `Invoice ${item.status}`,
          subtitle: item.partyName,
          amount: formatCurrency(item.amount, item.currency),
          timestamp: timeAgo(item.issuedAt),
        })
      );
    } else {
      investments.slice(0, 2).forEach((item) =>
        events.push({
          id: `invest-${item.id}`,
          type: "investment",
          title: "Investment Added",
          subtitle: item.assetName,
          amount: formatCurrency(item.amount, item.currency),
          timestamp: timeAgo(item.investedAt),
        })
      );
    }

    return events.sort(() => 0.5 - Math.random()).slice(0, 8);
  }, [income, expenses, investments, invoices, isSme]);

  /* ── Greeting ── */
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);


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
      className={`pb-12 pt-2 ${isSme ? "theme-sme" : "theme-personal"}`}
    >
      <div className="mx-auto w-full max-w-6xl space-y-8 sm:space-y-10">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 px-1">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
              {greeting} <span className="animate-wave origin-bottom-right inline-block">👋</span>
            </h1>
            <p className="text-muted-foreground font-medium mt-2 flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSme ? "bg-indigo-500" : "bg-emerald-500"
                } animate-pulse`}
              />
              {isSme ? "Business Performance Overview" : "Personal Wealth & Savings Growth"}
            </p>
            {workspaceSubtitle ? (
              <p className="text-xs font-medium text-primary/90 mt-2">{workspaceSubtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadDashboard()}
              className="rounded-2xl border-border/40 bg-background/50 backdrop-blur-md gap-2 h-11 px-5 font-bold hover:bg-muted/50 transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              asChild
              size="sm"
              className={`rounded-2xl ${
                isSme ? "bg-indigo-600 hover:bg-indigo-700" : "bg-emerald-600 hover:bg-emerald-700"
              } text-white gap-2 h-11 px-6 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]`}
            >
              <Link href={isSme ? "/tracker/invoice" : "/tracker/income"}>
                <Plus className="h-4 w-4" />
                {isSme ? "Create Invoice" : "Add Income"}
              </Link>
            </Button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <KpiCard
            title={stats.primary.label}
            value={formatCurrency(stats.primary.value as number, stats.currency)}
            change="Target 100%"
            changeType="neutral"
            icon={stats.primary.icon}
            iconBg={stats.primary.bg}
            iconColor={stats.primary.color}
          />
          <KpiCard
            title={stats.secondary.label}
            value={formatCurrency(stats.secondary.value as number, stats.currency)}
            change="Actual"
            changeType="neutral"
            icon={stats.secondary.icon}
            iconBg={stats.secondary.bg}
            iconColor={stats.secondary.color}
          />
          <KpiCard
            title={stats.tertiary.label}
            value={formatCurrency(stats.tertiary.value as number, stats.currency)}
            change="Net"
            changeType={(stats.tertiary.value as number) >= 0 ? "up" : "down"}
            icon={stats.tertiary.icon}
            iconBg={stats.tertiary.bg}
            iconColor={stats.tertiary.color}
          />
          <KpiCard
            title={stats.quaternary.label}
            value={stats.quaternary.value as string}
            change="Trend"
            changeType="up"
            icon={stats.quaternary.icon}
            iconBg={stats.quaternary.bg}
            iconColor={stats.quaternary.color}
          />
        </div>

        {/* ── Main Content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 rounded-3xl glass-dashboard p-6 sm:p-8 relative overflow-hidden group">
            <div
              className={`absolute -top-24 -right-24 w-64 h-64 ${
                isSme ? "bg-indigo-500/5" : "bg-emerald-500/5"
              } rounded-full blur-[100px] transition-all group-hover:scale-110 duration-1000`}
            />

            <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <h2 className="text-lg font-black text-foreground uppercase tracking-tight">
                  {isSme ? "Cash Flow Analysis" : "Income vs Expense"}
                </h2>
                <p className="text-xs font-bold text-muted-foreground mt-1 opacity-70">
                  Last 6 Months Performance
                </p>
              </div>
            </div>

            <div className="h-[320px] w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradPrimary" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={isSme ? "#6366f1" : "#10b981"}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={isSme ? "#6366f1" : "#10b981"}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="gradSecondary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke="var(--color-border)"
                    opacity={0.1}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 12, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  />
                  <ReTooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="Primary"
                    stroke={isSme ? "#6366f1" : "#10b981"}
                    strokeWidth={4}
                    fill="url(#gradPrimary)"
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Secondary"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    strokeDasharray="8 8"
                    fill="url(#gradSecondary)"
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Activity Feed */}
            <div className="rounded-3xl glass-dashboard p-6 sm:p-7 h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-black text-foreground uppercase tracking-widest">
                  Live Activity
                </h2>
                <div
                  className={`w-8 h-8 rounded-xl ${
                    isSme ? "bg-indigo-500/10" : "bg-emerald-500/10"
                  } flex items-center justify-center`}
                >
                  <Activity
                    className={`h-4 w-4 ${isSme ? "text-indigo-500" : "text-emerald-500"}`}
                  />
                </div>
              </div>

              <div className="space-y-1 relative">
                {activityFeed.map((event, i) => (
                  <ActivityItem key={event.id + i} event={event} index={i} />
                ))}
                {activityFeed.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-sm text-muted-foreground font-bold italic">
                      No recent activity
                    </p>
                  </div>
                )}
              </div>

              <Button
                asChild
                variant="ghost"
                className="w-full mt-6 rounded-2xl text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <Link href="/tracker/report">Full AI Report →</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Quick Actions Footer ── */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="rounded-3xl glass-dashboard p-6 sm:p-8"
        >
          <h2 className="text-sm font-black text-foreground uppercase tracking-widest mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { href: "/tracker/income", label: "Add Income", icon: TrendingUp, bg: "bg-emerald-500/10", color: "text-emerald-500" },
              { href: "/tracker/expense", label: "Add Expense", icon: CreditCard, bg: "bg-rose-500/10", color: "text-rose-500" },
              { href: "/tracker/invest", label: "Add Investment", icon: PiggyBank, bg: "bg-violet-500/10", color: "text-violet-500" },
              { href: "/tracker/report", label: "View Reports", icon: FileText, bg: "bg-blue-500/10", color: "text-blue-500" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-4 rounded-2xl border border-border/20 bg-background/30 p-4 hover:bg-muted/30 transition-all duration-300 group card-hover-glow"
              >
                <div className={`w-12 h-12 rounded-2xl ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <span className="text-sm font-bold text-foreground">{action.label}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.main>
  );
}
