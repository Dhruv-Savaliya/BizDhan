"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  LayoutDashboard,
  Activity,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Wallet,
  TrendingDown,
  LineChart
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { TrackerStats } from "@/lib/report";
import type {
  CashRunwayInsight,
  ExpenseLeak,
  FinancialHealthScore,
  OverdueItem,
} from "@/lib/summary-insights";

type SummaryPayload = {
  stats: TrackerStats;
  generatedAt: string;
  primaryCurrency: string;
  cashRunway: CashRunwayInsight;
  financialHealth: FinancialHealthScore;
  expenseLeaks: ExpenseLeak[];
  overdueInvoices: OverdueItem[];
};

const sectionVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function SummaryPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SummaryPayload | null>(null);

  async function load() {
    setLoading(true);
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
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/tracker/summary", { method: "GET" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to load summary");
        if (!cancelled) {
          setData({
            stats: json.stats as TrackerStats,
            generatedAt: String(json.generatedAt ?? ""),
            primaryCurrency: String(json.primaryCurrency ?? "INR"),
            cashRunway: json.cashRunway as CashRunwayInsight,
            financialHealth: json.financialHealth as FinancialHealthScore,
            expenseLeaks: (json.expenseLeaks ?? []) as ExpenseLeak[],
            overdueInvoices: (json.overdueInvoices ?? []) as OverdueItem[],
          });
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Failed to load summary";
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = data?.stats;
  const currencies = stats
    ? new Set([
        ...Object.keys(stats.totals.incomeTotals),
        ...Object.keys(stats.totals.expenseTotals),
        ...Object.keys(stats.totals.investmentTotals),
        ...Object.keys(stats.totals.cashflowTotals),
      ])
    : new Set<string>();

  const primaryCurrency = data?.primaryCurrency ?? [...currencies][0] ?? "INR";

  return (
    <motion.main 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="pb-10 pt-4"
    >
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <Card className="glass shadow-xl rounded-[2rem] border-primary/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10" />
          <div className="absolute -bottom-64 left-0 w-[500px] h-[500px] bg-destructive/5 rounded-full blur-[100px] -z-10" />

          <CardHeader className="px-8 pt-8 pb-6 border-b border-border/50 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <LayoutDashboard className="h-6 w-6 text-primary" aria-hidden />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold tracking-tight">Overview Dashboard</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Financial health score, cash runway, and expense leaks in {primaryCurrency}.
                  </CardDescription>
                  {data?.generatedAt ? (
                    <div className="inline-flex items-center mt-3 px-2.5 py-1 text-xs font-medium text-muted-foreground bg-muted/50 rounded-md border border-border/50">
                      <span className="relative flex h-2 w-2 mr-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/50 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                      Live Sync • {new Date(data.generatedAt).toLocaleTimeString()}
                    </div>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void load()}
                disabled={loading}
                className="shrink-0 rounded-xl h-10 px-4 border-border/50 shadow-sm hover:bg-muted"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh Data
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-8">
            {loading && !data ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="h-48 animate-pulse rounded-2xl bg-muted/50 border border-border/40" />
                  <div className="h-48 animate-pulse rounded-2xl bg-muted/50 border border-border/40" />
                </div>
                <div className="h-64 animate-pulse rounded-2xl bg-muted/50 border border-border/40" />
              </div>
            ) : data ? (
              <motion.div 
                variants={staggerContainer} 
                initial="hidden" 
                animate="show" 
                className="space-y-8"
              >
                
                {/* Top Quick Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Financial Health Score */}
                  <motion.section variants={sectionVariants} className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <Activity className="h-5 w-5 text-primary" aria-hidden />
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">SME Health Score</h2>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 shadow-sm flex-1 flex flex-col justify-between group hover:border-primary/20 transition-all">
                      <div>
                        <div className="flex items-end justify-between gap-4 mb-4">
                          <div>
                            <div className="flex items-baseline gap-1">
                              <p className="text-5xl font-black tabular-nums tracking-tighter text-foreground">
                                {data.financialHealth.score}
                              </p>
                              <span className="text-lg font-bold text-muted-foreground">/100</span>
                            </div>
                            <Badge className="mt-2 text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary/20 border-0" variant="secondary">
                              {data.financialHealth.label}
                            </Badge>
                          </div>
                          
                          <div className="w-16 h-16 rounded-full border-[6px] flex items-center justify-center shrink-0" 
                            style={{ 
                              borderColor: data.financialHealth.score >= 80 ? 'var(--radius-success, #22c55e)' : 
                                           data.financialHealth.score >= 50 ? 'var(--radius-warning, #eab308)' : 
                                           'var(--radius-destructive, #ef4444)'
                            }}>
                            <span className="font-bold text-lg">{data.financialHealth.score}%</span>
                          </div>
                        </div>
                        <Progress
                          value={data.financialHealth.score}
                          className={cn(
                            "h-2 w-full bg-muted/50",
                            data.financialHealth.score >= 80 &&
                              "[&_[data-slot=progress-indicator]]:bg-green-500",
                            data.financialHealth.score >= 50 &&
                              data.financialHealth.score < 80 &&
                              "[&_[data-slot=progress-indicator]]:bg-yellow-500",
                            data.financialHealth.score < 50 &&
                              "[&_[data-slot=progress-indicator]]:bg-red-500"
                          )}
                        />
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-border/50">
                        <ul className="space-y-2.5">
                          {data.financialHealth.breakdown.map((b) => (
                            <li key={b.key} className="text-xs flex justify-between items-center group-hover:opacity-100 opacity-80 transition-opacity">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                                <span className="font-medium text-foreground/80">{b.label}</span>
                              </div>
                              <span className="font-semibold">{b.value}/{b.weight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.section>

                  {/* Cash Runway Predictor */}
                  <motion.section variants={sectionVariants} className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <TrendingUp className="h-5 w-5 text-emerald-500" aria-hidden />
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cash Runway</h2>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 shadow-sm flex-1 flex flex-col justify-between group hover:border-emerald-500/20 transition-all">
                      <div>
                        {data.cashRunway.runwayMonths != null ? (
                          <div className="mb-4">
                            <h3 className="text-3xl font-black tracking-tight mb-1 text-foreground">
                              {data.cashRunway.runwayMonths === 0 
                                ? "Critical state" 
                                : `~${data.cashRunway.runwayMonths} months`}
                            </h3>
                            <p className="text-sm font-medium text-muted-foreground/80 leading-snug max-w-[90%]">
                              {data.cashRunway.headline}
                            </p>
                          </div>
                        ) : (
                          <div className="mb-4">
                            <h3 className="text-3xl font-black tracking-tight mb-1 text-foreground">Calculating</h3>
                            <p className="text-sm font-medium text-muted-foreground/80">Need more data to predict.</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 mt-6">
                          <div className="bg-muted/40 rounded-xl p-3 border border-border/30">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                              <Wallet className="w-3 h-3 text-emerald-500" />
                              30D Income
                            </div>
                            <div className="font-bold text-foreground">
                              <span className="text-xs text-muted-foreground mr-1">{data.cashRunway.currency}</span>
                              {data.cashRunway.income30d.toLocaleString()}
                            </div>
                          </div>
                          
                          <div className="bg-muted/40 rounded-xl p-3 border border-border/30">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                              <TrendingDown className="w-3 h-3 text-destructive" />
                              30D Expense
                            </div>
                            <div className="font-bold text-foreground">
                              <span className="text-xs text-muted-foreground mr-1">{data.cashRunway.currency}</span>
                              {data.cashRunway.expense30d.toLocaleString()}
                            </div>
                          </div>

                          <div className="bg-muted/40 rounded-xl p-3 border border-border/30">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                              <Activity className="w-3 h-3 text-blue-500" />
                              30D Net
                            </div>
                            <div className={`font-bold ${data.cashRunway.net30d >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                              <span className="text-xs text-muted-foreground mr-1">{data.cashRunway.currency}</span>
                              {data.cashRunway.net30d > 0 ? '+' : ''}{data.cashRunway.net30d.toLocaleString()}
                            </div>
                          </div>

                          <div className="bg-muted/40 rounded-xl p-3 border border-border/30">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                              <LineChart className="w-3 h-3 text-primary" />
                              All-T Net
                            </div>
                            <div className={`font-bold ${data.cashRunway.cumulativeNet >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                              <span className="text-xs text-muted-foreground mr-1">{data.cashRunway.currency}</span>
                              {data.cashRunway.cumulativeNet > 0 ? '+' : ''}{data.cashRunway.cumulativeNet.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.section>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Expense Leaks */}
                  <motion.section variants={sectionVariants} className="flex flex-col">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Expense Leaks</h2>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-1 shadow-sm flex-1 overflow-hidden group hover:border-amber-500/20 transition-colors">
                      {data.expenseLeaks.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center justify-center h-full min-h-[200px]">
                          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                            <TrendingDown className="h-5 w-5 text-emerald-500" />
                          </div>
                          <p className="text-sm font-medium text-foreground">Spending is healthy</p>
                          <p className="text-xs text-muted-foreground mt-1">No major concentration flags found.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto w-full">
                          <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/50">
                              <tr>
                                <th className="px-4 py-3 font-semibold rounded-tl-xl whitespace-nowrap">Entity</th>
                                <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Amount</th>
                                <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Share</th>
                                <th className="px-4 py-3 font-semibold text-center rounded-tr-xl whitespace-nowrap">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                              {data.expenseLeaks.map((row, i) => (
                                <tr key={`${row.kind}-${row.name}-${i}`} className="hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-foreground">{row.name}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase">{row.kind}</div>
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                                    <span className="text-xs text-muted-foreground mr-1">{row.currency}</span>
                                    {row.amount.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <span className="font-medium tabular-nums">{row.sharePercent}%</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <Badge
                                      variant="secondary"
                                      className={`text-[10px] uppercase font-bold tracking-wider rounded-md ${
                                        row.severity === "high"
                                          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                          : row.severity === "medium"
                                            ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
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
                    </div>
                  </motion.section>

                  {/* Overdue Invoices */}
                  <motion.section variants={sectionVariants} className="flex flex-col">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <Receipt className="h-5 w-5 text-destructive" aria-hidden />
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Overdue detection</h2>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-1 shadow-sm flex-1 overflow-hidden group hover:border-destructive/20 transition-colors">
                      {data.overdueInvoices.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center justify-center h-full min-h-[200px]">
                          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                            <Receipt className="h-5 w-5 text-emerald-500" />
                          </div>
                          <p className="text-sm font-medium text-foreground">All caught up</p>
                          <p className="text-xs text-muted-foreground mt-1">No overdue invoices found.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto w-full">
                          <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/50">
                              <tr>
                                <th className="px-4 py-3 font-semibold rounded-tl-xl whitespace-nowrap">Invoice</th>
                                <th className="px-4 py-3 font-semibold whitespace-nowrap">Client</th>
                                <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Amount</th>
                                <th className="px-4 py-3 font-semibold text-center rounded-tr-xl whitespace-nowrap">Due</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                              {data.overdueInvoices.map((row) => (
                                <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-3 font-medium text-foreground">{row.invoiceNumber}</td>
                                  <td className="px-4 py-3 text-muted-foreground text-xs">{row.partyName}</td>
                                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                                    <span className="text-xs text-muted-foreground mr-1">{row.currency}</span>
                                    {row.amount.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-center whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 py-1 rounded bg-destructive/10 text-destructive text-xs font-bold tabular-nums">
                                      {row.daysPastDue}d late
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </motion.section>
                </div>

                {/* Totals by Currency section */}
                <motion.section variants={sectionVariants} className="pt-4 border-t border-border/30">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 px-1">Portfolio Value & Transactions</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Income Entries</div>
                      <div className="text-3xl font-black tabular-nums">{data.stats.counts.incomeCount}</div>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Expense Entries</div>
                      <div className="text-3xl font-black tabular-nums">{data.stats.counts.expenseCount}</div>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Investment Entries</div>
                      <div className="text-3xl font-black tabular-nums">{data.stats.counts.investmentCount}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.keys(data.stats.totals.incomeTotals).length === 0 &&
                    Object.keys(data.stats.totals.expenseTotals).length === 0 &&
                    Object.keys(data.stats.totals.investmentTotals).length === 0 ? (
                      <div className="col-span-full rounded-2xl border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
                        No financial data yet. Add entries to see your multi-currency totals here.
                      </div>
                    ) : (
                      [primaryCurrency, ...[...currencies].filter((c) => c !== primaryCurrency)].map(
                        (cur) => (
                          <div key={cur} className="rounded-2xl border border-border/50 bg-card/40 hover:bg-card/80 transition-colors p-5 shadow-sm space-y-3 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                              <span className="text-6xl font-black">{cur}</span>
                            </div>
                            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                              {cur} Wallet
                            </div>
                            
                            <div className="space-y-2 relative z-10">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium">Income</span>
                                <span className="font-bold tabular-nums">
                                  {(data.stats.totals.incomeTotals[cur] ?? 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium">Expense</span>
                                <span className="font-bold tabular-nums">
                                  {(data.stats.totals.expenseTotals[cur] ?? 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium">Investments</span>
                                <span className="font-bold tabular-nums">
                                  {(data.stats.totals.investmentTotals[cur] ?? 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-base pt-3 mt-2 border-t border-border/50">
                                <span className="text-foreground font-semibold">Net Cashflow</span>
                                <span className={`font-black tabular-nums tracking-tight ${(data.stats.totals.cashflowTotals[cur] ?? 0) >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                                  {(data.stats.totals.cashflowTotals[cur] ?? 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                </motion.section>
              </motion.div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </motion.main>
  );
}
