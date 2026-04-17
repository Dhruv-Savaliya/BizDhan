"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import {
  Loader2,
  Plus,
  Package,
  Inbox,
  RefreshCw,
  ShoppingCart,
  CalendarDays,
  Trash2,
  Boxes,
  Wrench,
  PackageOpen,
  Coffee,
  CircleDollarSign,
  Hash,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import type { PurchaseCategory, PurchaseEntry } from "@/types/purchase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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

/* ── Category config ── */
const CATEGORY_CONFIG: Record<
  PurchaseCategory,
  { label: string; icon: LucideIcon; color: string; bg: string }
> = {
  raw_materials: { label: "Raw Materials", icon: Boxes, color: "text-amber-500", bg: "bg-amber-500/10" },
  retail_stock: { label: "Retail Stock", icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-500/10" },
  equipment: { label: "Equipment", icon: Wrench, color: "text-violet-500", bg: "bg-violet-500/10" },
  packaging: { label: "Packaging", icon: PackageOpen, color: "text-teal-500", bg: "bg-teal-500/10" },
  consumables: { label: "Consumables", icon: Coffee, color: "text-rose-500", bg: "bg-rose-500/10" },
  other: { label: "Other", icon: CircleDollarSign, color: "text-gray-500", bg: "bg-gray-500/10" },
};

/* ── Schema ── */
const schema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  quantity: z.coerce.number().positive(),
  unit: z.string().optional(),
  supplier: z.string().min(1, "Supplier is required"),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(3).default("INR"),
  category: z.enum([
    "raw_materials",
    "retail_stock",
    "equipment",
    "packaging",
    "consumables",
    "other",
  ]),
  purchasedAt: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

/* ── Helpers ── */
function formatMoney(currency: string, value: number) {
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
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
export default function PurchasePage() {
  const [items, setItems] = useState<PurchaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const maxDateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      itemName: "",
      quantity: 1,
      unit: "pcs",
      supplier: "",
      amount: 0,
      currency: "INR",
      category: "retail_stock",
      purchasedAt: "",
      notes: "",
    },
  });

  const categoryOptions = useMemo(
    () =>
      (Object.keys(CATEGORY_CONFIG) as PurchaseCategory[]).map((key) => ({
        value: key,
        label: CATEGORY_CONFIG[key].label,
        icon: CATEGORY_CONFIG[key].icon,
        color: CATEGORY_CONFIG[key].color,
      })),
    []
  );

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/tracker/purchase?limit=100", { method: "GET" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load purchases");
      setItems((data.data ?? []) as PurchaseEntry[]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load purchases";
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
      const res = await fetch("/api/tracker/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add purchase");

      toast.success("Purchase added successfully");
      form.reset({
        ...values,
        itemName: "",
        quantity: 1,
        supplier: "",
        amount: 0,
        notes: "",
      });
      setSheetOpen(false);
      await refresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to add purchase";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tracker/purchase?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete");
      toast.success("Purchase deleted");
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
    const totalSpent = items.reduce((s, it) => s + it.amount, 0);
    const now = new Date();
    const thisMonthSpent = items
      .filter((it) => {
        const d = new Date(it.purchasedAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, it) => s + it.amount, 0);
    const currency = items[0]?.currency ?? "INR";
    return { totalSpent, thisMonthSpent, totalCount: items.length, currency };
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
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Purchases</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track inventory, equipment and stock purchases.
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
                  Add Purchase
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto sm:max-w-md">
                <SheetHeader className="pb-4">
                  <SheetTitle className="text-lg">New Purchase</SheetTitle>
                  <SheetDescription>Record a new purchase entry.</SheetDescription>
                </SheetHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 px-4 pb-8">
                    {/* Item Name */}
                    <FormField
                      control={form.control}
                      name="itemName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Item Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Product or material name" className="rounded-xl h-11" {...field} disabled={submitting} />
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

                    {/* Category */}
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange} disabled={submitting}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl h-11 w-full [&>span]:text-sm">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              {categoryOptions.map((o) => {
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

                    {/* Quantity + Unit */}
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" inputMode="decimal" min={0} step="any" placeholder="10" className="rounded-xl h-11" {...field} disabled={submitting} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="unit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit</FormLabel>
                            <FormControl>
                              <Input placeholder="pcs, kg, box" className="rounded-xl h-11" {...field} disabled={submitting} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Supplier */}
                    <FormField
                      control={form.control}
                      name="supplier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supplier</FormLabel>
                          <FormControl>
                            <Input placeholder="Vendor Name" className="rounded-xl h-11" {...field} disabled={submitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Date */}
                    <FormField
                      control={form.control}
                      name="purchasedAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date Purchased</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" max={maxDateTime} className="rounded-xl h-11 w-full" {...field} disabled={submitting} />
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
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Details about this purchase" className="rounded-xl h-11" {...field} disabled={submitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full h-11 rounded-xl shadow-md font-semibold gap-2" disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Add Purchase
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
              {/* Total Spent */}
              <motion.div variants={itemVariants} initial="hidden" animate="show" className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 text-amber-500" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Spent</span>
                </div>
                <div className="text-xl font-black tabular-nums tracking-tight text-foreground">
                  {formatMoney(stats.currency, stats.totalSpent)}
                </div>
              </motion.div>

              {/* This Month */}
              <motion.div variants={itemVariants} initial="hidden" animate="show" transition={{ delay: 0.05 }} className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <CalendarDays className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">This Month</span>
                </div>
                <div className="text-xl font-black tabular-nums tracking-tight text-foreground">
                  {formatMoney(stats.currency, stats.thisMonthSpent)}
                </div>
              </motion.div>

              {/* Pending (placeholder — no "pending" field exists, show total items instead) */}
              <motion.div variants={itemVariants} initial="hidden" animate="show" transition={{ delay: 0.1 }} className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:border-violet-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Truck className="h-4 w-4 text-violet-500" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Suppliers</span>
                </div>
                <div className="text-xl font-black tabular-nums tracking-tight text-foreground">
                  {new Set(items.map((i) => i.supplier)).size}
                </div>
              </motion.div>

              {/* Total Count */}
              <motion.div variants={itemVariants} initial="hidden" animate="show" transition={{ delay: 0.15 }} className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Hash className="h-4 w-4 text-emerald-500" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Count</span>
                </div>
                <div className="text-xl font-black tabular-nums tracking-tight text-foreground">
                  {stats.totalCount}
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>

        {/* ── Purchase Entries ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Recent Purchases
              {!loading && items.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">({items.length})</span>
              )}
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-muted/40 border border-border/30" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-border/60 bg-muted/10">
              <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-muted-foreground py-8">
                <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center">
                  <Inbox className="h-6 w-6 opacity-40" />
                </div>
                <p className="text-sm font-medium">No purchase entries yet</p>
                <p className="text-xs text-muted-foreground/70">Tap &quot;Add Purchase&quot; to record your first entry.</p>
              </CardContent>
            </Card>
          ) : (
            <motion.div className="space-y-3" variants={containerVariants} initial="hidden" animate="show">
              <AnimatePresence>
                {items.map((it) => {
                  const config = CATEGORY_CONFIG[it.category] ?? CATEGORY_CONFIG.other;
                  const Icon = config.icon;
                  const isDeleting = deletingId === it.id;

                  return (
                    <motion.div
                      variants={itemVariants}
                      exit="exit"
                      key={it.id}
                      layout
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm hover:bg-card transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:border-border/70"
                    >
                      {/* Left */}
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-11 h-11 rounded-xl ${config.bg} flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105`}>
                          <Icon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-foreground text-[15px] leading-tight">
                            {it.itemName}
                            <span className="text-muted-foreground font-normal text-sm ml-1.5">
                              × {it.quantity} {it.unit}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                            <span className={`inline-flex items-center gap-1 ${config.bg} ${config.color} px-2 py-0.5 rounded-md font-medium text-[11px]`}>
                              {config.label}
                            </span>
                            <span className="text-border">•</span>
                            <span className="truncate max-w-[100px]">{it.supplier}</span>
                            {it.purchasedAt && (
                              <>
                                <span className="text-border hidden sm:inline">•</span>
                                <span className="hidden sm:inline-flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  {formatShortDate(it.purchasedAt)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:w-auto w-full pl-15 sm:pl-0 border-t sm:border-0 pt-3 sm:pt-0 border-border/40">
                        <div className="text-right shrink-0">
                          <div className="text-xs text-muted-foreground font-medium mb-0.5">{it.currency}</div>
                          <span className="font-bold text-lg text-foreground tracking-tight whitespace-nowrap tabular-nums">
                            {it.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
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
                              <AlertDialogTitle>Delete Purchase</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{it.itemName}&quot;? This action cannot be undone.
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
