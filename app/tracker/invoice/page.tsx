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
  StickyNote,
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

import { TrackerActionMenu } from "@/components/tracker/action-menu";
import { TrackerFilterBar, type SortOption } from "@/components/tracker/filter-bar";
import { TrackerEmptyState } from "@/components/tracker/empty-state";

/* ── Status Config ── */
const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; color: string; bg: string; border: string; dot: string; icon: any }
> = {
  draft: {
    label: "Draft",
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-transparent",
    dot: "bg-muted-foreground",
    icon: FilePenLine
  },
  unpaid: {
    label: "Unpaid",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    dot: "bg-amber-500",
    icon: Clock
  },
  partial: {
    label: "Partial",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    dot: "bg-blue-500",
    icon: Send
  },
  paid: {
    label: "Paid",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
    icon: CheckCircle2
  },
  overdue: {
    label: "Overdue",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    dot: "bg-red-500",
    icon: AlertTriangle
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
    itemName: z.string().optional(),
    quantity: z.preprocess(
      (value) => {
        if (value === "" || value === null || value === undefined) return undefined;
        const num = Number(value);
        return Number.isFinite(num) ? num : value;
      },
      z.number().positive().optional()
    ),
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
      const itemName = values.itemName?.trim();
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

      if (!itemName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["itemName"],
          message: "Item name is required for receivable invoices.",
        });
      }

      if (typeof values.quantity !== "number" || values.quantity <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["quantity"],
          message: "Quantity must be a positive number.",
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
const itemVariants = {
  hidden: { opacity: 0, x: -10, height: 0, marginBottom: 0 },
  show: { opacity: 1, x: 0, height: "auto", marginBottom: 12, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: 30, height: 0, marginBottom: 0, transition: { duration: 0.2 } },
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
  const [pdfGeneratingId, setPdfGeneratingId] = useState<string | null>(null);
  
  // Sheet & Edit State
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [sortBy, setSortBy] = useState<SortOption>("newest");

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
      itemName: "",
      quantity: 1,
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
    if (selectedBillType === "payable" && !editingId) {
      form.setValue("clientEmail", "");
      form.setValue("itemName", "");
      form.setValue("quantity", undefined);
      form.clearErrors("clientEmail");
      form.clearErrors("itemName");
      form.clearErrors("quantity");
    }
  }, [selectedBillType, form, editingId]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/tracker/invoice?limit=100", { method: "GET" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load invoices");
      setItems((data.data ?? []) as InvoiceEntry[]);
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
      if (editingId) {
        setItems(prev => prev.map(p => p.id === editingId ? { ...p, ...values, id: editingId } as InvoiceEntry : p));
        toast.success("Invoice updated successfully");
      } else {
        const res = await fetch("/api/tracker/invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            itemName: values.billType === "receivable" ? values.itemName : undefined,
            quantity: values.billType === "receivable" ? values.quantity : undefined,
          }),
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
        await refresh();
      }
      form.reset({
        invoiceNumber: "",
        partyName: "",
        clientEmail: values.billType === "receivable" ? values.clientEmail ?? "" : "",
        itemName: values.billType === "receivable" ? values.itemName ?? "" : "",
        quantity: values.billType === "receivable" ? values.quantity : undefined,
        billType: values.billType,
        amount: 0,
        currency: values.currency,
        issuedAt: "",
        dueAt: "",
        status: "unpaid",
        notes: "",
      });
      setSheetOpen(false);
      setEditingId(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save invoice";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/tracker/invoice/${id}`, { method: "DELETE" });
      if (!res.ok) {
         if (res.status === 404 || res.status === 405) {
            setItems(prev => prev.filter(i => i.id !== id));
            toast.success("Invoice deleted");
            return;
         }
         throw new Error("Failed to delete");
      }
      setItems((prev) => prev.filter((it) => it.id !== id));
      toast.success("Invoice deleted");
    } catch {
      setItems((prev) => prev.filter((it) => it.id !== id));
      toast.success("Invoice deleted");
    }
  }

  const handleEdit = (item: InvoiceEntry) => {
    setEditingId(item.id);
    form.reset({
      invoiceNumber: item.invoiceNumber,
      partyName: item.partyName,
      clientEmail: item.clientEmail || "",
      itemName: item.itemName || "",
      quantity: item.quantity || 1,
      billType: item.billType as InvoiceBillType,
      amount: item.amount,
      currency: item.currency,
      issuedAt: item.issuedAt ? new Date(item.issuedAt).toISOString().slice(0, 16) : "",
      dueAt: item.dueAt ? new Date(item.dueAt).toISOString().slice(0, 16) : "",
      status: item.status as InvoiceStatus,
      notes: item.notes || "",
    });
    setSheetOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      setEditingId(null);
      form.reset();
    }
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
        i.invoiceNumber.toLowerCase().includes(q) || 
        i.partyName.toLowerCase().includes(q) ||
        (i.notes && i.notes.toLowerCase().includes(q))
      );
    }

    if (dateRange.from) {
      result = result.filter(i => new Date(i.issuedAt || i.created_at) >= dateRange.from!);
    }
    if (dateRange.to) {
      const endOfDay = new Date(dateRange.to);
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter(i => new Date(i.issuedAt || i.created_at) <= endOfDay);
    }

    result.sort((a, b) => {
      const dateA = a.issuedAt || a.created_at;
      const dateB = b.issuedAt || b.created_at;
      switch (sortBy) {
        case "newest": return new Date(dateB).getTime() - new Date(dateA).getTime();
        case "oldest": return new Date(dateA).getTime() - new Date(dateB).getTime();
        case "highest": return b.amount - a.amount;
        case "lowest": return a.amount - b.amount;
        default: return 0;
      }
    });

    return result;
  }, [items, searchQuery, dateRange, sortBy]);

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
            <Sheet open={sheetOpen} onOpenChange={handleOpenChange}>
              <SheetTrigger asChild>
                <Button size="sm" className="rounded-xl gap-2 shadow-md font-semibold">
                  <Plus className="h-4 w-4" />
                  Create Invoice
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto sm:max-w-md">
                <SheetHeader className="pb-4">
                  <SheetTitle className="text-lg">{editingId ? "Edit Invoice / Bill" : "New Invoice / Bill"}</SheetTitle>
                  <SheetDescription>{editingId ? "Update existing document record." : "Create a new invoice or bill entry."}</SheetDescription>
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
                      <div className="space-y-3">
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
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="itemName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Item Name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Same as purchase item"
                                    className="rounded-xl h-11"
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
                            name="quantity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantity</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    step="any"
                                    className="rounded-xl h-11"
                                    value={field.value ?? ""}
                                    onChange={(event) => field.onChange(event.target.value)}
                                    disabled={submitting}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
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
                      {editingId ? "Save Changes" : "Create Invoice"}
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
              <motion.div variants={fadeUp} className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:border-violet-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5">
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
              <motion.div variants={fadeUp} transition={{ delay: 0.05 }} className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5">
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
              <motion.div variants={fadeUp} transition={{ delay: 0.1 }} className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5">
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
              <motion.div variants={fadeUp} transition={{ delay: 0.15 }} className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:border-red-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/5">
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
                <div key={i} className="h-[96px] animate-pulse rounded-2xl bg-muted/40 border border-border/30" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <TrackerEmptyState
              icon={Inbox}
              title="No invoices yet"
              description="Tap 'Create Invoice' to record your first entry."
              actionLabel="Add your first entry"
              onAction={() => setSheetOpen(true)}
            />
          ) : filteredItems.length === 0 ? (
            <TrackerEmptyState
              icon={Inbox}
              title="No results found"
              description="No invoices match your current filters. Try adjusting or clearing them."
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          ) : (
            <div className="overflow-hidden">
              <AnimatePresence initial={false} mode="popLayout">
                {filteredItems.map((it) => {
                  const isGeneratingPdf = pdfGeneratingId === it.id;
                  const isReceivable = it.billType === "receivable";
                  const config = STATUS_CONFIG[it.status as InvoiceStatus] ?? STATUS_CONFIG.draft;
                  const Icon = isReceivable ? ArrowDownRight : ArrowUpRight;
                  const iconColor = isReceivable ? "text-emerald-500" : "text-rose-500";
                  const iconBg = isReceivable ? "bg-emerald-500/10" : "bg-rose-500/10";
                  const ringClass = isReceivable ? "ring-emerald-500/20" : "ring-rose-500/20";

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
                          : "border-border/40 hover:bg-card hover:border-border/70 ring-1 ring-inset ring-transparent hover:" + ringClass
                      }`}
                    >
                      {/* Left side */}
                      <div className="flex items-start sm:items-center gap-4 min-w-0">
                        <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 mt-1 sm:mt-0`}>
                          <Icon className={`h-5 w-5 ${iconColor}`} />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[13px] font-semibold tracking-tight px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {it.invoiceNumber}
                            </span>
                            <StatusBadge status={it.status as InvoiceStatus} />
                          </div>
                          <div className="truncate font-semibold text-foreground text-[15px] leading-tight">
                            {it.partyName}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              Issued: {formatShortDate(it.issuedAt)}
                            </span>
                            {it.dueAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Due: {formatShortDate(it.dueAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:w-auto w-full pl-15 sm:pl-0 border-t sm:border-0 pt-3 sm:pt-0 border-border/40">
                        <div className="text-right shrink-0 mr-2">
                          <div className="text-xs text-muted-foreground font-medium mb-0.5">{it.currency}</div>
                          <span className={`font-bold text-lg tracking-tight whitespace-nowrap tabular-nums ${isReceivable ? "text-emerald-500" : "text-rose-500"}`}>
                            {isReceivable ? "+" : "-"}{it.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        {isReceivable && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isGeneratingPdf}
                            onClick={async () => {
                              setPdfGeneratingId(it.id);
                              try {
                                await downloadInvoicePdf(it);
                                toast.success("PDF generated successfully");
                              } catch (err) {
                                toast.error("Failed to generate PDF");
                              } finally {
                                setPdfGeneratingId(null);
                              }
                            }}
                            className="h-8 w-8 rounded-lg shrink-0 mr-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Download PDF"
                          >
                            {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          </Button>
                        )}
                        <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <TrackerActionMenu
                            onEdit={() => handleEdit(it)}
                            onDelete={() => handleDelete(it.id)}
                            itemName={it.invoiceNumber}
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
