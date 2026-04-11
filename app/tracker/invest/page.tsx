"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, TrendingUp, Inbox, PieChart } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { motion } from "framer-motion";

import type { InvestSummary } from "@/types/invest";
import type { InvestmentEntry, InvestmentType } from "@/types/investment";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

function formatMoney(currency: string, value: number) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}${currency} ${abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

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

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const sectionVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
};

export default function InvestPage() {
  const [summaries, setSummaries] = useState<InvestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InvestmentEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const maxDateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      amount: 0,
      currency: "USD",
      type: "mutual_fund",
      assetName: "",
      investedAt: "",
      notes: "",
    },
  });

  const typeOptions = useMemo(
    () =>
      [
        { value: "stocks", label: "Stocks" },
        { value: "mutual_fund", label: "Mutual fund" },
        { value: "crypto", label: "Crypto" },
        { value: "fd", label: "Fixed Deposit" },
        { value: "rd", label: "Recurring Deposit" },
        { value: "bond", label: "Bonds" },
        { value: "gold", label: "Gold" },
        { value: "real_estate", label: "Real estate" },
        { value: "ppf", label: "PPF" },
        { value: "nps", label: "NPS" },
        { value: "other", label: "Other" },
      ] as const satisfies ReadonlyArray<{ value: InvestmentType; label: string }>,
    []
  );

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/tracker/invest?limit=100", { method: "GET" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load invest summary");
      setSummaries((data.summaries ?? []) as InvestSummary[]);
      setItems((data.items ?? []) as InvestmentEntry[]);
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
      const res = await fetch("/api/tracker/invest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add investment");

      toast.success("Investment added successfully");
      form.reset({ ...values, amount: 0, assetName: "", notes: "" });
      await refresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to add investment";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.main 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="pb-10 pt-4"
    >
      <div className="mx-auto w-full max-w-4xl space-y-6">
        
        {/* Availability Summary Card */}
        <motion.div variants={sectionVariants} initial="hidden" animate="show">
          <Card className="glass shadow-lg rounded-2xl border-primary/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[60px] -z-10" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight text-foreground/90">Available to Invest</CardTitle>
                  <CardDescription className="text-sm mt-1">Calculated as Total Income − Total Expense for this workspace.</CardDescription>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => void refresh()} 
                  disabled={loading || submitting}
                  className="rounded-full shadow-sm hover:bg-muted/50 border-border/50 transition-colors shrink-0"
                >
                  <Loader2 className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : 'hidden'}`} />
                  <span className={`text-muted-foreground ${loading ? 'hidden' : 'block'}`}>↻</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading && summaries.length === 0 ? (
                <div className="space-y-4 flex justify-between gap-4">
                  <div className="h-24 flex-1 animate-pulse rounded-2xl bg-muted/50 border border-border/40" />
                  <div className="h-24 flex-1 animate-pulse rounded-2xl bg-muted/50 border border-border/40" />
                  <div className="h-24 flex-1 animate-pulse rounded-2xl bg-muted/50 border border-border/40" />
                </div>
              ) : summaries.length === 0 ? (
                 <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
                  <PieChart className="h-5 w-5 opacity-50" />
                  No summary available yet. Add income and expenses.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {summaries.map((s) => (
                    <div key={s.currency} className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Using the standard glass component inside but styling distinctly */}
                      <div className="rounded-2xl border border-border/50 bg-background/40 p-5 shadow-sm space-y-2 relative overflow-hidden group hover:border-border/80 transition-all">
                         <div className="absolute right-0 bottom-0 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none transform translate-x-4 translate-y-4">
                           <TrendingUp className="w-24 h-24" />
                         </div>
                         <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Income</div>
                         <div className="text-2xl font-black tabular-nums tracking-tight">{formatMoney(s.currency, s.totalIncome)}</div>
                      </div>
                      
                      <div className="rounded-2xl border border-border/50 bg-background/40 p-5 shadow-sm space-y-2 relative overflow-hidden group hover:border-border/80 transition-all">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Expense</div>
                         <div className="text-2xl font-black tabular-nums tracking-tight">{formatMoney(s.currency, s.totalExpense)}</div>
                      </div>
                      
                      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 shadow-sm space-y-2 relative overflow-hidden ring-1 ring-inset ring-blue-500/10">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] -z-10" />
                        <div className="text-xs font-bold uppercase tracking-wider text-blue-500">Available to Invest</div>
                        <div className={`text-3xl font-black tabular-nums tracking-tighter ${s.availableToInvest > 0 ? 'text-foreground' : 'text-destructive'}`}>
                          {formatMoney(s.currency, s.availableToInvest)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Investment Tracker Card */}
        <motion.div variants={sectionVariants} initial="hidden" animate="show" transition={{ delay: 0.1 }}>
          <Card className="glass shadow-xl rounded-[2rem] border-primary/10 overflow-hidden relative">
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[80px] -z-10" />
            
            <CardHeader className="px-8 pt-8 pb-6 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <PieChart className="h-6 w-6 text-primary" aria-hidden />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold tracking-tight">Investments</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Record your asset purchases and allocations.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8 space-y-10">
              {/* Input Form */}
              <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">New Entry</h3>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                inputMode="decimal" 
                                placeholder="0.00" 
                                className="rounded-xl bg-background border-border/50 h-11 text-lg font-medium shadow-sm transition-all focus:bg-background/80 focus-visible:ring-blue-500/20" 
                                {...field} 
                                disabled={submitting} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Currency</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="USD" 
                                className="rounded-xl bg-background border-border/50 h-11 shadow-sm transition-all focus:bg-background/80 focus-visible:ring-blue-500/20" 
                                {...field} 
                                disabled={submitting} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Asset Class</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <select
                                  aria-label="Investment type"
                                  className="h-11 w-full rounded-xl border border-border/50 bg-background px-4 py-2 text-sm shadow-sm appearance-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                                  value={field.value}
                                  onChange={field.onChange}
                                  disabled={submitting}
                                >
                                  {typeOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
                                  <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="assetName"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2 lg:col-span-3">
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Asset Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="NIFTY 50 / VOO / Bitcoin" 
                                className="rounded-xl bg-background border-border/50 h-11 shadow-sm transition-all focus:bg-background/80 focus-visible:ring-blue-500/20" 
                                {...field} 
                                disabled={submitting} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="investedAt"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2 lg:col-span-1">
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</FormLabel>
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

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2 lg:col-span-2">
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes (Optional)</FormLabel>
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

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button 
                        type="submit" 
                        className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 rounded-xl shadow-md min-w-[140px] font-semibold active:scale-[0.98] transition-all" 
                        disabled={submitting}
                      >
                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Add Entry
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>

              {/* List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Entries</h3>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/50 border border-border/40" />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 text-muted-foreground">
                    <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center shadow-sm">
                      <Inbox className="h-5 w-5 opacity-50" />
                    </div>
                    <p className="text-sm">No investment entries found.</p>
                  </div>
                ) : (
                  <motion.div 
                    className="space-y-3"
                    initial="hidden"
                    animate="show"
                    variants={{ show: { transition: { staggerChildren: 0.05 } } }}
                  >
                    {items.map((it) => (
                      <motion.div 
                        variants={itemVariants}
                        key={it.id} 
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm hover:bg-muted/30 transition-all duration-300 hover:shadow-md hover:border-border"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <PieChart className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-foreground text-base">
                              {it.assetName}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span className="capitalize bg-muted px-2 py-0.5 rounded-md font-medium text-foreground/80">{it.type.replace('_', ' ')}</span>
                              <span>•</span>
                              <span>{formatDate(it.investedAt)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full pl-14 sm:pl-0 border-t sm:border-0 pt-3 sm:pt-0 border-border/50">
                          {it.notes ? (
                            <div className="text-xs text-muted-foreground/70 truncate max-w-[150px] italic hidden sm:block">
                              &ldquo;{it.notes}&rdquo;
                            </div>
                          ) : <div className="hidden sm:block w-[150px]" />}
                          <div className="text-right shrink-0">
                            <span className="text-xs text-muted-foreground font-medium mr-1.5">{it.currency}</span>
                            <span className="font-bold text-lg text-foreground tracking-tight whitespace-nowrap">
                              {it.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.main>
  );
}
