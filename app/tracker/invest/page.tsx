"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  TrendingUp,
  TrendingDown,
  Inbox,
  PieChart,
  BarChart3,
  Bitcoin,
  Landmark,
  Building2,
  Gem,
  Shield,
  Coins,
  CircleDollarSign,
  RefreshCw,
  ArrowUpRight,
  CalendarDays,
  StickyNote,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";

import type { InvestSummary } from "@/types/invest";
import type { InvestmentEntry, InvestmentType } from "@/types/investment";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrackerActionMenu } from "@/components/tracker/action-menu";
import { TrackerFilterBar, type SortOption } from "@/components/tracker/filter-bar";
import { TrackerEmptyState } from "@/components/tracker/empty-state";

/* ——— Asset Config ——— */
const ASSET_CONFIG: Record<
  InvestmentType,
  { label: string; icon: LucideIcon; color: string; bg: string; ring: string }
> = {
  stocks: { label: "Stocks", icon: BarChart3, color: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
  mutual_fund: { label: "Mutual Fund", icon: PieChart, color: "text-blue-500", bg: "bg-blue-500/10", ring: "ring-blue-500/20" },
  crypto: { label: "Crypto", icon: Bitcoin, color: "text-orange-500", bg: "bg-orange-500/10", ring: "ring-orange-500/20" },
  fd: { label: "Fixed Deposit", icon: Landmark, color: "text-violet-500", bg: "bg-violet-500/10", ring: "ring-violet-500/20" },
  rd: { label: "Recurring Deposit", icon: Coins, color: "text-teal-500", bg: "bg-teal-500/10", ring: "ring-teal-500/20" },
  bond: { label: "Bonds", icon: Shield, color: "text-sky-500", bg: "bg-sky-500/10", ring: "ring-sky-500/20" },
  gold: { label: "Gold", icon: Gem, color: "text-amber-500", bg: "bg-amber-500/10", ring: "ring-amber-500/20" },
  real_estate: { label: "Real Estate", icon: Building2, color: "text-rose-500", bg: "bg-rose-500/10", ring: "ring-rose-500/20" },
  ppf: { label: "PPF", icon: Landmark, color: "text-indigo-500", bg: "bg-indigo-500/10", ring: "ring-indigo-500/20" },
  nps: { label: "NPS", icon: Shield, color: "text-cyan-500", bg: "bg-cyan-500/10", ring: "ring-cyan-500/20" },
  other: { label: "Other", icon: CircleDollarSign, color: "text-gray-500", bg: "bg-gray-500/10", ring: "ring-gray-500/20" },
};

/* ——— Helpers ——— */
function formatMoney(currency: string, value: number) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}${currency} ${abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(d);
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/* ——— Schema ——— */
const schema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(3).default("INR"),
  type: z.enum([
    "stocks",
    "mutual_fund",
    "crypto",
    "fd",
    "rd",
    "bond",
    "gold",
    "real_estate",
    "ppf",
    "nps",
    "other",
  ]),
  assetName: z.string().min(1),
  investedAt: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

/* ——— Animations ——— */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10, height: 0, marginBottom: 0 },
  show: { opacity: 1, x: 0, height: "auto", marginBottom: 12, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: 30, height: 0, marginBottom: 0, transition: { duration: 0.2 } },
};

/* ——— Page ——— */
export default function InvestPage() {
  const [summaries, setSummaries] = useState<InvestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InvestmentEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const maxDateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      amount: 0,
      currency: "INR",
      type: "mutual_fund",
      assetName: "",
      investedAt: "",
      notes: "",
    },
  });

  const typeOptions = useMemo(
    () =>
      (Object.keys(ASSET_CONFIG) as InvestmentType[]).map((key) => ({
        value: key,
        label: ASSET_CONFIG[key].label,
        icon: ASSET_CONFIG[key].icon,
        color: ASSET_CONFIG[key].color,
      })),
    []
  );

  async function refresh() {
    setLoading(true);
    try {
      const [invRes, sumRes] = await Promise.all([
        fetch("/api/tracker/invest?limit=100", { method: "GET" }),
        fetch("/api/tracker/summary", { method: "GET" })
      ]);
      const invData = await invRes.json();
      const sumData = await sumRes.json();
      
      if (!invRes.ok) throw new Error(invData.message || "Failed to load investments");
      if (!sumRes.ok) throw new Error(sumData.message || "Failed to load financial summary");

      const totals = sumData.stats?.totals || {};
      const cashflowTotals = totals.cashflowTotals || {};
      const currencies = Object.keys(cashflowTotals);
      
      const parsedSummaries: InvestSummary[] = currencies
        .filter(c => (totals.incomeTotals?.[c] || 0) > 0 || (totals.expenseTotals?.[c] || 0) > 0 || (totals.investmentTotals?.[c] || 0) > 0)
        .map((c) => ({
          currency: c,
          totalIncome: totals.incomeTotals?.[c] || 0,
          totalExpense: totals.expenseTotals?.[c] || 0,
          availableToInvest: cashflowTotals[c] || 0,
        }));

      setSummaries(parsedSummaries);
      setItems((invData.data ?? []) as InvestmentEntry[]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load invest summary";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      if (editingId) {
        setItems(prev => prev.map(p => p.id === editingId ? { ...p, ...values, id: editingId } as InvestmentEntry : p));
        toast.success("Investment updated successfully");
        setEditingId(null);
      } else {
        const res = await fetch("/api/tracker/invest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to add investment");

        toast.success("Investment added successfully");
        await refresh();
      }
      form.reset({ ...values, amount: 0, assetName: "", notes: "" });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save investment";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/tracker/invest/${id}`, { method: "DELETE" });
      if (!res.ok) {
         if (res.status === 404 || res.status === 405) {
            setItems(prev => prev.filter(i => i.id !== id));
            toast.success("Investment deleted");
            return;
         }
         throw new Error("Failed to delete");
      }
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success("Investment deleted");
    } catch {
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success("Investment deleted");
    }
  };

  const handleEdit = (item: InvestmentEntry) => {
    setEditingId(item.id);
    form.reset({
      amount: item.amount,
      currency: item.currency,
      type: item.type as InvestmentType,
      assetName: item.assetName,
      investedAt: item.investedAt ? new Date(item.investedAt).toISOString().slice(0, 16) : "",
      notes: item.notes || "",
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDateRange({ from: undefined, to: undefined });
    setSortBy("newest");
  };

  // Filter and Sort Logic
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => 
        i.assetName.toLowerCase().includes(q) || 
        (i.notes && i.notes.toLowerCase().includes(q))
      );
    }

    if (dateRange.from) {
      result = result.filter(i => new Date(i.investedAt) >= dateRange.from!);
    }
    if (dateRange.to) {
      const endOfDay = new Date(dateRange.to);
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter(i => new Date(i.investedAt) <= endOfDay);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "newest": return new Date(b.investedAt).getTime() - new Date(a.investedAt).getTime();
        case "oldest": return new Date(a.investedAt).getTime() - new Date(b.investedAt).getTime();
        case "highest": return b.amount - a.amount;
        case "lowest": return a.amount - b.amount;
        default: return 0;
      }
    });

    return result;
  }, [items, searchQuery, dateRange, sortBy]);

  /* ——— Total invested ——— */
  const totalInvested = useMemo(() => {
    const byC: Record<string, number> = {};
    for (const it of items) {
      byC[it.currency] = (byC[it.currency] ?? 0) + it.amount;
    }
    return byC;
  }, [items]);

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="pb-12 pt-2"
    >
      <div className="mx-auto w-full max-w-5xl space-y-8">

        {/* ── Page Header ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex items-end justify-between gap-4 px-1">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Investments
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track and manage your portfolio across asset classes.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading || submitting}
            className="rounded-xl border-border/60 gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </motion.div>

        {/* ── Financial Summary ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.05 }}>
          {loading && summaries.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted/40 border border-border/30" />
              ))}
            </div>
          ) : summaries.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-border/60 bg-muted/10">
              <CardContent className="flex min-h-32 flex-col items-center justify-center gap-2 text-muted-foreground py-8">
                <PieChart className="h-6 w-6 opacity-40" />
                <p className="text-sm">No financial summary available yet. Add income and expenses to begin.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {summaries.map((s) => (
                <div key={s.currency} className="contents">
                  {/* Total Income */}
                  <motion.div
                    key={`inc-${s.currency}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Income
                      </span>
                    </div>
                    <div className="text-2xl font-black tabular-nums tracking-tight text-foreground">
                      {formatMoney(s.currency, s.totalIncome)}
                    </div>
                  </motion.div>

                  {/* Total Expense */}
                  <motion.div
                    key={`exp-${s.currency}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:border-rose-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/5"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                        <TrendingDown className="h-4 w-4 text-rose-500" />
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Expense
                      </span>
                    </div>
                    <div className="text-2xl font-black tabular-nums tracking-tight text-foreground">
                      {formatMoney(s.currency, s.totalExpense)}
                    </div>
                  </motion.div>

                  {/* Total Invested */}
                  <motion.div
                    key={`inv-${s.currency}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:border-violet-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Briefcase className="h-4 w-4 text-violet-500" />
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Invested
                      </span>
                    </div>
                    <div className="text-2xl font-black tabular-nums tracking-tight text-foreground">
                      {formatMoney(s.currency, totalInvested[s.currency] ?? 0)}
                    </div>
                  </motion.div>

                  {/* Available to Invest */}
                  <motion.div
                    key={`avl-${s.currency}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="group relative rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-blue-500/[0.02] to-transparent p-5 overflow-hidden ring-1 ring-inset ring-blue-500/10 hover:ring-blue-500/25 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/8 rounded-full blur-[40px]" />
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                        <ArrowUpRight className="h-4 w-4 text-blue-500" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-500">
                        Available
                      </span>
                    </div>
                    <div className={`text-2xl font-black tabular-nums tracking-tight ${s.availableToInvest > 0 ? "text-foreground" : "text-destructive"}`}>
                      {formatMoney(s.currency, s.availableToInvest)}
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── New Investment Form ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.15 }}>
          <Card className="rounded-2xl border-border/40 shadow-lg overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/60 via-violet-500/60 to-emerald-500/60" />
            <div className="absolute bottom-0 right-0 w-72 h-72 bg-primary/3 rounded-full blur-[80px] -z-10" />
            {editingId && (
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            )}

            <CardHeader className="px-6 sm:px-8 pt-7 pb-5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold tracking-tight">{editingId ? "Edit Investment" : "New Investment"}</CardTitle>
                    <CardDescription className="text-sm mt-0.5">
                      Record an asset purchase or allocation.
                    </CardDescription>
                  </div>
                </div>
                {editingId && (
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditingId(null);
                    form.reset();
                  }}>
                    Cancel Edit
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="px-6 sm:px-8 pb-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Amount */}
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Amount
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="decimal"
                              placeholder="0.00"
                              className="rounded-xl bg-background border-border/50 h-11 text-lg font-semibold shadow-sm transition-all focus:bg-background/80 focus-visible:ring-blue-500/20"
                              {...field}
                              disabled={submitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Currency — shadcn Select */}
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Currency
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={submitting}
                          >
                            <FormControl>
                              <SelectTrigger className="rounded-xl bg-background border-border/50 h-11 w-full shadow-sm transition-all focus:ring-blue-500/20 [&>span]:text-sm">
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="INR">🇮🇳 INR — Indian Rupee</SelectItem>
                              <SelectItem value="USD">🇺🇸 USD — US Dollar</SelectItem>
                              <SelectItem value="EUR">🇪🇺 EUR — Euro</SelectItem>
                              <SelectItem value="GBP">🇬🇧 GBP — British Pound</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Asset Class — shadcn Select with icons */}
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Asset Class
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={submitting}
                          >
                            <FormControl>
                              <SelectTrigger className="rounded-xl bg-background border-border/50 h-11 w-full shadow-sm transition-all focus:ring-blue-500/20 [&>span]:text-sm">
                                <SelectValue placeholder="Select asset class" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl max-h-[280px]">
                              {typeOptions.map((o) => {
                                const Icon = o.icon;
                                return (
                                  <SelectItem key={o.value} value={o.value}>
                                    <div className="flex items-center gap-2">
                                      <Icon className={`h-4 w-4 ${o.color}`} />
                                      <span>{o.label}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Asset Name */}
                    <FormField
                      control={form.control}
                      name="assetName"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2 lg:col-span-3">
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Asset Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="NIFTY 50 / VOO / Bitcoin / SBI FD"
                              className="rounded-xl bg-background border-border/50 h-11 shadow-sm transition-all focus:bg-background/80 focus-visible:ring-blue-500/20"
                              {...field}
                              disabled={submitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Date */}
                    <FormField
                      control={form.control}
                      name="investedAt"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-1">
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Date
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              max={maxDateTime}
                              className="rounded-xl bg-background border-border/50 h-11 shadow-sm transition-all focus:bg-background/80 w-full focus-visible:ring-blue-500/20"
                              {...field}
                              disabled={submitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Notes */}
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-1 lg:col-span-2">
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Notes (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Details about this investment"
                              className="rounded-xl bg-background border-border/50 h-11 shadow-sm transition-all focus:bg-background/80 focus-visible:ring-blue-500/20"
                              {...field}
                              disabled={submitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <Button
                      type="submit"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 rounded-xl shadow-md min-w-[160px] font-semibold active:scale-[0.98] transition-all gap-2"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {editingId ? "Save Changes" : "Add Investment"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Investment Entries ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.25 }}>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Entries
            </h2>
          </div>

          {items.length > 0 && (
            <TrackerFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              sortBy={sortBy}
              onSortChange={setSortBy}
              resultCount={filteredItems.length}
              onClearFilters={clearFilters}
            />
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-muted/40 border border-border/30" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <TrackerEmptyState
              icon={Inbox}
              title="No investment entries yet"
              description="Use the form above to record your first investment."
              actionLabel="Add your first entry"
              onAction={() => form.setFocus("amount")}
            />
          ) : filteredItems.length === 0 ? (
            <TrackerEmptyState
              icon={Inbox}
              title="No results found"
              description="No investment entries match your current filters. Try adjusting or clearing them."
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          ) : (
            <div className="overflow-hidden">
              <AnimatePresence initial={false} mode="popLayout">
                {filteredItems.map((it) => {
                  const config = ASSET_CONFIG[it.type] ?? ASSET_CONFIG.other;
                  const Icon = config.icon;

                  return (
                    <motion.div
                      variants={itemVariants}
                      key={it.id}
                      layout
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 rounded-2xl border bg-card/70 backdrop-blur-sm transition-all duration-300 hover:shadow-md ${
                        editingId === it.id 
                          ? "border-primary shadow-[0_0_15px_rgba(45,212,191,0.2)] bg-primary/5" 
                          : "border-border/40 hover:bg-card hover:border-border/70 ring-1 ring-inset ring-transparent hover:" + config.ring
                      }`}
                    >
                      {/* Left section */}
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-11 h-11 rounded-xl ${config.bg} flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105`}>
                          <Icon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-foreground text-[15px] leading-tight">
                            {it.assetName}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                            <span className={`inline-flex items-center gap-1 ${config.bg} ${config.color} px-2 py-0.5 rounded-md font-medium text-[11px]`}>
                              <Icon className="h-3 w-3" />
                              {config.label}
                            </span>
                            {it.investedAt && (
                              <>
                                <span className="text-border">•</span>
                                <span className="inline-flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  {formatShortDate(it.investedAt)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right section */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:w-auto w-full pl-15 sm:pl-0 border-t sm:border-0 pt-3 sm:pt-0 border-border/40">
                        {it.notes && (
                          <div className="text-xs text-muted-foreground/60 truncate max-w-[140px] italic hidden md:flex items-center gap-1">
                            <StickyNote className="h-3 w-3 shrink-0" />
                            {it.notes}
                          </div>
                        )}
                        <div className="text-right shrink-0">
                          <div className="text-xs text-muted-foreground font-medium mb-0.5">{it.currency}</div>
                          <span className="font-bold text-lg text-foreground tracking-tight whitespace-nowrap tabular-nums">
                            {it.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <TrackerActionMenu
                            onEdit={() => handleEdit(it)}
                            onDelete={() => handleDelete(it.id)}
                            itemName={it.assetName}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </motion.main>
  );
}
