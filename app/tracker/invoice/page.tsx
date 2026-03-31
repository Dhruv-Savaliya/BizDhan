"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Loader2, Plus, FileText, Download, Inbox } from "lucide-react";
import { motion } from "framer-motion";

import type { InvoiceBillType, InvoiceEntry, InvoiceStatus } from "@/types/invoice";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

const schema = z.object({
  invoiceNumber: z.string().min(1, "Invoice or bill number is required"),
  partyName: z.string().min(1, "Party name is required"),
  billType: z.enum(["payable", "receivable"]),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(3).default("INR"),
  issuedAt: z.string().optional(),
  dueAt: z.string().optional(),
  status: z.enum(["draft", "unpaid", "partial", "paid", "overdue"]),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(d);
}

function billTypeLabel(t: InvoiceBillType) {
  return t === "payable" ? "Bill (Payable)" : "Invoice (Receivable)";
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const map: Record<InvoiceStatus, { label: string, colorClass: string }> = {
    draft: { label: "Draft", colorClass: "bg-muted text-muted-foreground border-transparent" },
    unpaid: { label: "Unpaid", colorClass: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    partial: { label: "Partial", colorClass: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    paid: { label: "Paid", colorClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    overdue: { label: "Overdue", colorClass: "bg-destructive/10 text-destructive border-destructive/20" },
  };
  
  const config = map[status];
  
  return (
    <Badge variant="outline" className={`font-semibold uppercase tracking-wider text-[10px] ${config.colorClass}`}>
      {config.label}
    </Badge>
  );
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function InvoicePage() {
  const [items, setItems] = useState<InvoiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      invoiceNumber: "",
      partyName: "",
      billType: "receivable",
      amount: 0,
      currency: "USD",
      issuedAt: "",
      dueAt: "",
      status: "unpaid",
      notes: "",
    },
  });

  const statusOptions = useMemo(
    () =>
      [
        { value: "draft", label: "Draft" },
        { value: "unpaid", label: "Unpaid" },
        { value: "partial", label: "Partial" },
        { value: "paid", label: "Paid" },
        { value: "overdue", label: "Overdue" },
      ] as const satisfies ReadonlyArray<{ value: InvoiceStatus; label: string }>,
    []
  );

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/tracker/invoice?limit=100", { method: "GET" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load bills");
      setItems((data.items ?? []) as InvoiceEntry[]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load bills";
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
      const res = await fetch("/api/tracker/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add document");

      toast.success("Document saved successfully");
      form.reset({
        invoiceNumber: "",
        partyName: "",
        billType: values.billType,
        amount: 0,
        currency: values.currency,
        issuedAt: "",
        dueAt: "",
        status: "unpaid",
        notes: "",
      });
      await refresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save document";
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
        <Card className="glass shadow-xl rounded-[2rem] border-violet-500/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[80px] -z-10" />
          
          <CardHeader className="px-8 pt-8 pb-6 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-violet-500" aria-hidden />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight">Invoices & Bills</CardTitle>
                <CardDescription className="text-base mt-1">
                  Manage sent invoices (receivables) and received bills (payables).
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8 space-y-10">
            {/* Input Form */}
            <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">Create New Document</h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    
                    <FormField
                      control={form.control}
                      name="invoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Document Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g. INV-001" 
                              className="rounded-xl bg-background border-border/50 h-11 shadow-sm transition-all focus:bg-background/80 focus-visible:ring-violet-500/20 uppercase" 
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
                      name="partyName"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-1 lg:col-span-2">
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Party (Customer / Vendor)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Client or Vendor Name" 
                              className="rounded-xl bg-background border-border/50 h-11 shadow-sm transition-all focus:bg-background/80 focus-visible:ring-violet-500/20" 
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
                      name="billType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <select
                                className="h-11 w-full rounded-xl border border-border/50 bg-background px-4 py-2 text-sm shadow-sm appearance-none transition-all focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 disabled:opacity-50"
                                value={field.value}
                                onChange={field.onChange}
                                disabled={submitting}
                              >
                                <option value="receivable">Invoice (Receivable)</option>
                                <option value="payable">Bill (Payable)</option>
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
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              inputMode="decimal" 
                              placeholder="0.00" 
                              className="rounded-xl bg-background border-border/50 h-11 text-lg font-medium shadow-sm transition-all focus:bg-background/80 focus-visible:ring-violet-500/20" 
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
                              className="rounded-xl bg-background border-border/50 h-11 shadow-sm transition-all focus:bg-background/80 focus-visible:ring-violet-500/20" 
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
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <select
                                className="h-11 w-full rounded-xl border border-border/50 bg-background px-4 py-2 text-sm shadow-sm appearance-none transition-all focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 disabled:opacity-50"
                                value={field.value}
                                onChange={field.onChange}
                                disabled={submitting}
                              >
                                {statusOptions.map((o) => (
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
                      name="issuedAt"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-1 border-r border-transparent lg:col-span-1">
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Issue Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local" 
                              className="rounded-xl bg-background border-border/50 h-11 shadow-sm transition-all focus:bg-background/80 w-full focus-visible:ring-violet-500/20" 
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
                      name="dueAt"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-1 lg:col-span-1">
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local" 
                              className="rounded-xl bg-background border-border/50 h-11 shadow-sm transition-all focus:bg-background/80 w-full focus-visible:ring-violet-500/20" 
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
                        <FormItem className="sm:col-span-2 lg:col-span-3">
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Details about this document" 
                              className="rounded-xl bg-background border-border/50 h-11 shadow-sm transition-all focus:bg-background/80 focus-visible:ring-violet-500/20" 
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
                      className="bg-violet-500 hover:bg-violet-600 text-white h-11 rounded-xl shadow-md min-w-[140px] font-semibold active:scale-[0.98] transition-all" 
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                      Save Document
                    </Button>
                  </div>
                </form>
              </Form>
            </div>

            {/* List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Documents</h3>
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
                  <p className="text-sm">No documents found.</p>
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
                      <div className="flex items-start sm:items-center gap-4 min-w-0 w-full sm:w-auto">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-1 sm:mt-0 ${
                          it.billType === 'receivable' ? 'bg-violet-500/10 text-violet-500' : 'bg-destructive/10 text-destructive'
                        }`}>
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-foreground text-base tracking-tight truncate">
                              {it.partyName}
                            </span>
                            <StatusBadge status={it.status} />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/70">{it.invoiceNumber}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{billTypeLabel(it.billType)}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="block sm:inline w-full sm:w-auto">
                              Iss: {formatDate(it.issuedAt)} {it.dueAt && `→ Due: ${formatDate(it.dueAt)}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-14 sm:pl-0 border-t sm:border-0 pt-3 sm:pt-0 border-border/50 mt-1 sm:mt-0">
                        <div className="text-left sm:text-right shrink-0">
                          <span className="text-xs text-muted-foreground font-medium mr-1.5">{it.currency}</span>
                          <span className={`font-bold text-lg tracking-tight whitespace-nowrap ${
                            it.billType === 'receivable' ? 'text-foreground' : 'text-foreground'
                          }`}>
                            {it.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="rounded-xl h-9 w-9 shrink-0 shadow-sm border-border/50 hover:bg-muted hover:text-foreground text-muted-foreground"
                          title="Download PDF"
                          onClick={() =>
                            void downloadInvoicePdf(it).catch(() =>
                              toast.error("Could not generate PDF")
                            )
                          }
                        >
                          <Download className="h-4 w-4" />
                        </Button>
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
