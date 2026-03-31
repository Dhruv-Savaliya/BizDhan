"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Loader2, Plus, TrendingUp, Inbox } from "lucide-react";

import type { IncomeCategory, IncomeEntry } from "@/types/income";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { motion } from "framer-motion";

const schema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(3).default("INR"),
  category: z.enum([
    "salary",
    "freelance",
    "business",
    "interest",
    "dividend",
    "rental",
    "gift",
    "other",
  ]),
  source: z.string().min(1),
  receivedAt: z.string().optional(),
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

export default function IncomePage() {
  const router = useRouter();
  const [items, setItems] = useState<IncomeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      amount: 0,
      currency: "USD",
      category: "business",
      source: "",
      receivedAt: "",
      notes: "",
    },
  });

  const categoryOptions = useMemo(
    () =>
      [
        { value: "business", label: "Business" },
        { value: "freelance", label: "Freelance" },
        { value: "rental", label: "Rental income" },
        { value: "salary", label: "Salary" },
        { value: "interest", label: "Interest" },
        { value: "dividend", label: "Dividend" },
        { value: "gift", label: "Gift" },
        { value: "other", label: "Other" },
      ] as const satisfies ReadonlyArray<{ value: IncomeCategory; label: string }>,
    []
  );

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/tracker/income?limit=100", { method: "GET" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load income");
      setItems((data.items ?? []) as IncomeEntry[]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load income";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/signout", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to log out");
      }
      router.push("/login");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to log out";
      toast.error(message);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/tracker/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add income");

      toast.success("Income added successfully");
      form.reset({
        amount: 0,
        currency: values.currency,
        category: values.category,
        source: "",
        receivedAt: "",
        notes: "",
      });
      await refresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to add income";
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
      <div className="mx-auto w-full max-w-4xl">
        <Card className="glass shadow-xl rounded-[2rem] border-primary/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -z-10" />
          
          <CardHeader className="px-8 pt-8 pb-6 border-b border-border/50 bg-muted/20">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" aria-hidden />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold tracking-tight">Income</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Record revenue and profit-related inflows.
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-semibold"
                onClick={() => void handleLogout()}
              >
                Log out
              </Button>
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
                              className="rounded-xl bg-background border-border/50 h-11 text-lg font-medium shadow-sm transition-all focus:bg-background/80" 
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
                              className="rounded-xl bg-background border-border/50 h-11 shadow-sm transition-all focus:bg-background/80" 
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
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <select
                                aria-label="Income category"
                                className="h-11 w-full rounded-xl border border-border/50 bg-background px-4 py-2 text-sm shadow-sm appearance-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                                value={field.value}
                                onChange={field.onChange}
                                disabled={submitting}
                              >
                                {categoryOptions.map((o) => (
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
                      name="source"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2 lg:col-span-3">
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Company / Client / Bank" 
                              className="rounded-xl bg-background border-border/50 h-11 shadow-sm transition-all focus:bg-background/80" 
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
                      name="receivedAt"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2 lg:col-span-1">
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local" 
                              className="rounded-xl bg-background border-border/50 h-11 shadow-sm transition-all focus:bg-background/80 w-full" 
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
                              placeholder="Details about this income" 
                              className="rounded-xl bg-background border-border/50 h-11 shadow-sm transition-all focus:bg-background/80" 
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
                      className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-xl shadow-md min-w-[140px] font-semibold active:scale-[0.98] transition-all" 
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
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => void refresh()} 
                  disabled={loading || submitting}
                  className="rounded-lg h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : "Refresh"}
                </Button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/50 border border-border/40" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 text-muted-foreground">
                  <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center shadow-sm">
                    <Inbox className="h-5 w-5 opacity-50" />
                  </div>
                  <p className="text-sm">No income entries found.</p>
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
                          <TrendingUp className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-foreground text-base">
                            {it.source}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="capitalize bg-muted px-2 py-0.5 rounded-md font-medium text-foreground/80">{it.category}</span>
                            <span>•</span>
                            <span>{formatDate(it.receivedAt)}</span>
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
                            +{it.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
      </div>
    </motion.main>
  );
}
