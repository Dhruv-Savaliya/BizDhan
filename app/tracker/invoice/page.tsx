"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import {
  Loader2,
  Plus,
  FileText,
  Download,
  Inbox,
  RefreshCw,
  Trash2,
  CircleDollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CalendarDays,
  Hash,
  Send,
  FilePenLine,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import type { InvoiceBillType, InvoiceEntry, InvoiceStatus } from "@/types/invoice";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/* ── Status Config ── */
const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  draft: {
    label: "Draft",
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-transparent",
    dot: "bg-muted-foreground",
  },
  unpaid: {
    label: "Unpaid",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    dot: "bg-amber-500",
  },
  partial: {
    label: "Partial",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    dot: "bg-blue-500",
  },
  paid: {
    label: "Paid",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  overdue: {
    label: "Overdue",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    dot: "bg-red-500",
  },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <Badge
      variant="outline"
      className={`font-semibold uppercase tracking-wider text-[10px] gap-1.5 ${c.color} ${c.bg} ${c.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </Badge>
  );
}

/* ── Schema ── */
const schema = z
  .object({
    invoiceNumber: z.string().min(1, "Invoice or bill number is required"),
    partyName: z.string().min(1, "Party name is required"),
    clientEmail: z.string().optional(),
    billType: z.enum(["payable", "receivable"]),
    amount: z.coerce.number().positive(),
    currency: z.string().min(3).max(3).default("INR"),
    issuedAt: z.string().optional(),
    dueAt: z.string().optional(),
    status: z.enum(["draft", "unpaid", "partial", "paid", "overdue"]),
    notes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.billType === "receivable") {
      const email = values.clientEmail?.trim();
      if (!email) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["clientEmail"],
          message: "Client email is required for receivable invoices.",
        });
      } else if (!z.string().email().safeParse(email).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["clientEmail"],
          message: "Enter a valid client email.",
        });
      }
    }

    if (!values.dueAt) return;
    const dueDate = new Date(values.dueAt);
    if (Number.isNaN(dueDate.getTime())) return;

    if (dueDate.getTime() < Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueAt"],
        message: "Due date must be current or future.",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

/* ── Helpers ── */
function formatMoney(currency: string, value: number) {
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatShortDate(iso: string | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/* ── Animations ── */
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

/* ── Page ── */
export default function InvoicePage() {
  const [items, setItems] = useState<InvoiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const now = new Date();
  const toLocalDateTimeInput = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const issueMinDateTime = toLocalDateTimeInput(
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  );
  const issueMaxDateTime = toLocalDateTimeInput(
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0, 0)
  );
  const minDueDateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      invoiceNumber: "",
      partyName: "",
      clientEmail: "",
      billType: "receivable",
      amount: 0,
      currency: "INR",
      issuedAt: "",
      dueAt: "",
      status: "unpaid",
      notes: "",
    },
  });
  const selectedBillType = form.watch("billType");

  useEffect(() => {
    if (selectedBillType === "payable") {
      form.setValue("clientEmail", "");
      form.clearErrors("clientEmail");
    }
  }, [selectedBillType, form]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/tracker/invoice?limit=100", { method: "GET" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load invoices");
      setItems((data.items ?? []) as InvoiceEntry[]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load invoices";
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
      if (!res.ok) throw new Error(data.message || "Failed to create invoice");

      if (values.billType === "receivable") {
        toast.success(
          data.emailSent
            ? "Invoice created and sent to client email"
            : "Invoice created, but email could not be sent"
        );
      } else {
        toast.success("Invoice created successfully");
      }
      form.reset({
        invoiceNumber: "",
        partyName: "",
        clientEmail: values.billType === "receivable" ? values.clientEmail ?? "" : "",
        billType: values.billType,
        amount: 0,
        currency: values.currency,
        issuedAt: "",
        dueAt: "",
        status: "unpaid",
        notes: "",
      });
      setSheetOpen(false);
      await refresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create invoice";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tracker/invoice?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete");
      toast.success("Invoice deleted");
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to delete";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  /* ── Stats ── */
  const stats = useMemo(() => {
    const currency = items[0]?.currency ?? "INR";
    const totalInvoiced = items.reduce((s, it) => s + it.amount, 0);
    const paid = items.filter((it) => it.status === "paid").reduce((s, it) => s + it.amount, 0);
    const unpaid = items.filter((it) => it.status === "unpaid" || it.status === "partial").reduce((s, it) => s + it.amount, 0);
    const overdueCount = items.filter((it) => it.status === "overdue").length;
    return { totalInvoiced, paid, unpaid, overdueCount, currency };
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
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Invoices</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage invoices, bills, and payment tracking.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={loading || submitting}
              className="rounded-xl border-border/60 gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button size="sm" className="rounded-xl gap-2 shadow-md font-semibold">
                  <Plus className="h-4 w-4" />
                  Create Invoice
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto sm:max-w-md">
                <SheetHeader className="pb-4">
                  <SheetTitle className="text-lg">New Invoice / Bill</SheetTitle>
                  <SheetDescription>Create a new invoice or bill entry.</SheetDescription>
                </SheetHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 px-4 pb-8">
                    {/* Document Number */}
                    <FormField
                      control={form.control}
                      name="invoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Document Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. INV-001" className="rounded-xl h-11 uppercase" {...field} disabled={submitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Client Name */}
                    <FormField
                      control={form.control}
                      name="partyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client / Vendor Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Client or Vendor Name" className="rounded-xl h-11" {...field} disabled={submitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Amount + Currency */}
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</FormLabel>
                            <FormControl>
                              <Input type="number" inputMode="decimal" placeholder="0.00" className="rounded-xl h-11 text-lg font-semibold" {...field} disabled={submitting} />
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
                            <Select value={field.value} onValueChange={field.onChange} disabled={submitting}>
                              <FormControl>
                                <SelectTrigger className="rounded-xl h-11 w-full [&>span]:text-sm">
                                  <SelectValue placeholder="Currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="INR">🇮🇳 INR</SelectItem>
                                <SelectItem value="USD">🇺🇸 USD</SelectItem>
                                <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                                <SelectItem value="GBP">🇬🇧 GBP</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Bill Type */}
                    <FormField
                      control={form.control}
                      name="billType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange} disabled={submitting}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl h-11 w-full [&>span]:text-sm">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="receivable">
                                <div className="flex items-center gap-2">
                                  <ArrowDownRight className="h-4 w-4 text-emerald-500" />
                                  <span>Invoice (Receivable)</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="payable">
                                <div className="flex items-center gap-2">
                                  <ArrowUpRight className="h-4 w-4 text-rose-500" />
                                  <span>Bill (Payable)</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedBillType === "receivable" && (
                      <FormField
                        control={form.control}
                        name="clientEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="client@example.com"
                                className="rounded-xl h-11"
                                {...field}
                                disabled={submitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Status */}
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange} disabled={submitting}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl h-11 w-full [&>span]:text-sm">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="draft">
                                <div className="flex items-center gap-2">
                                  <FilePenLine className="h-4 w-4 text-muted-foreground" />
                                  <span>Draft</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="unpaid">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-amber-500" />
                                  <span>Unpaid</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="partial">
                                <div className="flex items-center gap-2">
                                  <Send className="h-4 w-4 text-blue-500" />
                                  <span>Partial</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="paid">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  <span>Paid</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="overdue">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                  <span>Overdue</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="issuedAt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Issue Date</FormLabel>
                            <FormControl>
                              <Input
                                type="datetime-local"
                                min={issueMinDateTime}
                                max={issueMaxDateTime}
                                className="rounded-xl h-11 w-full"
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
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Date</FormLabel>
                            <FormControl>
                              <Input
                                type="datetime-local"
                                min={minDueDateTime}
                                className="rounded-xl h-11 w-full"
                                {...field}
                                disabled={submitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Notes */}
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Details about this invoice" className="rounded-xl h-11" {...field} disabled={submitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full h-11 rounded-xl shadow-md font-semibold gap-2" disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Create Invoice
                    </Button>
                  </form>
                </Form>
              </SheetContent>
            </Sheet>
          </div>
        </motion.div>

        {/* ── Stat Cards ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.05 }}>
          {loading && items.length === 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/40 border border-border/30" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Invoiced */}
              <motion.div variants={itemVariants} initial="hidden" animate="show" className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:border-violet-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <CircleDollarSign className="h-4 w-4 text-violet-500" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Invoiced</span>
                </div>
                <div className="text-xl font-black tabular-nums tracking-tight text-foreground">
                  {formatMoney(stats.currency, stats.totalInvoiced)}
                </div>
              </motion.div>

              {/* Paid */}
              <motion.div variants={itemVariants} initial="hidden" animate="show" transition={{ delay: 0.05 }} className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Paid</span>
                </div>
                <div className="text-xl font-black tabular-nums tracking-tight text-foreground">
                  {formatMoney(stats.currency, stats.paid)}
                </div>
              </motion.div>

              {/* Unpaid */}
              <motion.div variants={itemVariants} initial="hidden" animate="show" transition={{ delay: 0.1 }} className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-amber-500" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Unpaid</span>
                </div>
                <div className="text-xl font-black tabular-nums tracking-tight text-foreground">
                  {formatMoney(stats.currency, stats.unpaid)}
                </div>
              </motion.div>

              {/* Overdue Count */}
              <motion.div variants={itemVariants} initial="hidden" animate="show" transition={{ delay: 0.15 }} className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:border-red-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Overdue</span>
                </div>
                <div className="text-xl font-black tabular-nums tracking-tight text-foreground">
                  {stats.overdueCount}
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>

        {/* ── Invoice List ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Recent Documents
              {!loading && items.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">({items.length})</span>
              )}
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[96px] animate-pulse rounded-2xl bg-muted/40 border border-border/30" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-border/60 bg-muted/10">
              <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-muted-foreground py-8">
                <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center">
                  <Inbox className="h-6 w-6 opacity-40" />
                </div>
                <p className="text-sm font-medium">No invoices yet</p>
                <p className="text-xs text-muted-foreground/70">Tap &quot;Create Invoice&quot; to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <motion.div className="space-y-3" variants={containerVariants} initial="hidden" animate="show">
              <AnimatePresence>
                {items.map((it) => {
                  const isDeleting = deletingId === it.id;
                  const isReceivable = it.billType === "receivable";

                  return (
                    <motion.div
                      variants={itemVariants}
                      exit="exit"
                      key={it.id}
                      layout
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm hover:bg-card transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:border-border/70"
                    >
                      {/* Left */}
                      <div className="flex items-start sm:items-center gap-4 min-w-0 w-full sm:w-auto">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 transition-transform duration-300 group-hover:scale-105 ${isReceivable ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                          <FileText className={`h-5 w-5 ${isReceivable ? "text-emerald-500" : "text-rose-500"}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="font-semibold text-foreground text-[15px] tracking-tight truncate">
                              {it.partyName}
                            </span>
                            <StatusBadge status={it.status} />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1 font-medium text-foreground/70">
                              <Hash className="h-3 w-3" />
                              {it.invoiceNumber}
                            </span>
                            <span className="text-border">•</span>
                            <span className={`text-[11px] font-medium ${isReceivable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                              {isReceivable ? "Receivable" : "Payable"}
                            </span>
                            {it.dueAt && (
                              <>
                                <span className="text-border hidden sm:inline">•</span>
                                <span className="hidden sm:inline-flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  Due {formatShortDate(it.dueAt)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:w-auto w-full pl-15 sm:pl-0 border-t sm:border-0 pt-3 sm:pt-0 border-border/40">
                        <div className="text-right shrink-0 mr-1">
                          <div className="text-xs text-muted-foreground font-medium mb-0.5">{it.currency}</div>
                          <span className="font-bold text-lg text-foreground tracking-tight whitespace-nowrap tabular-nums">
                            {it.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Download PDF */}
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

                        {/* Delete */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 opacity-0 group-hover:opacity-100 transition-all"
                              disabled={isDeleting}
                            >
                              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete invoice &quot;{it.invoiceNumber}&quot; for {it.partyName}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                onClick={() => void handleDelete(it.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.main>
  );
}
