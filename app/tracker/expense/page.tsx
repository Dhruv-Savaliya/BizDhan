"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Loader2, Plus, Wallet, Inbox } from "lucide-react";

import type { ExpenseCategory, ExpenseEntry } from "@/types/expense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { TrackerActionMenu } from "@/components/tracker/action-menu";
import { TrackerFilterBar, type SortOption } from "@/components/tracker/filter-bar";
import { TrackerEmptyState } from "@/components/tracker/empty-state";

const schema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(3).default("INR"),
  category: z.enum([
    "food",
    "rent",
    "utilities",
    "transport",
    "shopping",
    "health",
    "education",
    "entertainment",
    "travel",
    "subscriptions",
    "tax",
    "marketing",
    "store_expense",
    "other",
  ]),
  merchant: z.string().min(1),
  spentAt: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type OcrCategory =
  | "Food"
  | "Groceries"
  | "Transport"
  | "Utilities"
  | "Shopping"
  | "Healthcare"
  | "Entertainment"
  | "Other";

type OcrModelUsed =
  | "tesseract+groq"
  | "gemini-vision"
  | "tesseract+gemini"
  | "pdfjs+groq"
  | "pdfjs+gemini";

type OcrPayload = {
  amount: number | null;
  date: string | null;
  merchant: string | null;
  category: OcrCategory | null;
  notes: string | null;
};

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
  hidden: { opacity: 0, x: -10, height: 0, marginBottom: 0 },
  show: { opacity: 1, x: 0, height: "auto", marginBottom: 12, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: 30, height: 0, marginBottom: 0, transition: { duration: 0.2 } },
};

export default function ExpensePage() {
  const [items, setItems] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [ocrModelUsed, setOcrModelUsed] = useState<OcrModelUsed | null>(null);
  
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
      currency: "USD",
      category: "rent",
      merchant: "",
      spentAt: "",
      notes: "",
    },
  });

  const categoryOptions = useMemo(
    () =>
      [
        { value: "rent", label: "Rent" },
        { value: "store_expense", label: "Store expense" },
        { value: "marketing", label: "Marketing" },
        { value: "utilities", label: "Utilities" },
        { value: "food", label: "Food" },
        { value: "transport", label: "Transport" },
        { value: "shopping", label: "Shopping" },
        { value: "health", label: "Health" },
        { value: "education", label: "Education" },
        { value: "entertainment", label: "Entertainment" },
        { value: "travel", label: "Travel" },
        { value: "subscriptions", label: "Subscriptions" },
        { value: "tax", label: "Tax" },
        { value: "other", label: "Other" },
      ] as const satisfies ReadonlyArray<{ value: ExpenseCategory; label: string }>,
    []
  );

  function mapOcrCategoryToExpenseCategory(category: OcrCategory | null): ExpenseCategory {
    switch (category) {
      case "Food":
        return "food";
      case "Groceries":
        return "store_expense";
      case "Transport":
        return "transport";
      case "Utilities":
        return "utilities";
      case "Shopping":
        return "shopping";
      case "Healthcare":
        return "health";
      case "Entertainment":
        return "entertainment";
      default:
        return "other";
    }
  }

  function modelBadgeLabel(model: OcrModelUsed) {
    switch (model) {
      case "gemini-vision":
        return "Scanned via Gemini";
      case "tesseract+groq":
        return "Scanned via Tesseract + Groq";
      case "tesseract+gemini":
        return "Scanned via Tesseract + Gemini";
      case "pdfjs+groq":
        return "Scanned via PDF.js + Groq";
      case "pdfjs+gemini":
        return "Scanned via PDF.js + Gemini";
      default:
        return "Scanned";
    }
  }

  async function handleReceiptUpload(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";
    if (!selectedFile) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Unsupported file type. Upload JPG, PNG, WEBP, or PDF.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    setScanningReceipt(true);
    setOcrModelUsed(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/tracker/ocr", {
        method: "POST",
        body: formData,
      });

      const json = (await res.json()) as
        | { success: true; data: OcrPayload; modelUsed?: OcrModelUsed }
        | { success: false; error?: string };

      if (!res.ok || !json.success) {
        const message =
          "error" in json && typeof json.error === "string"
            ? json.error
            : "Failed to scan receipt. Please fill manually.";
        throw new Error(message);
      }

      const scanned = json.data;
      if (typeof scanned.amount === "number" && Number.isFinite(scanned.amount)) {
        form.setValue("amount", scanned.amount, { shouldValidate: true });
      }

      if (typeof scanned.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(scanned.date)) {
        form.setValue("spentAt", `${scanned.date}T12:00`, { shouldValidate: true });
      }

      if (typeof scanned.merchant === "string" && scanned.merchant.trim()) {
        form.setValue("merchant", scanned.merchant.trim(), { shouldValidate: true });
      }

      if (typeof scanned.notes === "string" && scanned.notes.trim()) {
        form.setValue("notes", scanned.notes.trim(), { shouldValidate: true });
      }

      const mappedCategory = mapOcrCategoryToExpenseCategory(scanned.category ?? null);
      form.setValue("category", mappedCategory, { shouldValidate: true });

      const headerModel = res.headers.get("X-OCR-Model-Used");
      const modelUsed =
        (headerModel as OcrModelUsed | null) ??
        (json.modelUsed && typeof json.modelUsed === "string" ? json.modelUsed : null);
      setOcrModelUsed(modelUsed as OcrModelUsed | null);

      toast.success("Receipt scanned! Please review the details.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to scan receipt";
      toast.error(message);
    } finally {
      setScanningReceipt(false);
    }
  }

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/tracker/expense?limit=100", { method: "GET" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load expenses");
      setItems((data.data ?? []) as ExpenseEntry[]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load expenses";
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
        setItems(prev => prev.map(p => p.id === editingId ? { ...p, ...values, id: editingId } as ExpenseEntry : p));
        toast.success("Expense updated successfully");
        setEditingId(null);
      } else {
        const res = await fetch("/api/tracker/expense", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to add expense");

        toast.success("Expense added successfully");
        await refresh();
      }
      
      form.reset({
        amount: 0,
        currency: values.currency,
        category: values.category,
        merchant: "",
        spentAt: "",
        notes: "",
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save expense";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/tracker/expense/${id}`, { method: "DELETE" });
      if (!res.ok) {
         if (res.status === 404 || res.status === 405) {
            setItems(prev => prev.filter(i => i.id !== id));
            toast.success("Expense deleted");
            return;
         }
         throw new Error("Failed to delete");
      }
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success("Expense deleted");
    } catch {
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success("Expense deleted");
    }
  };

  const handleEdit = (item: ExpenseEntry) => {
    setEditingId(item.id);
    form.reset({
      amount: item.amount,
      currency: item.currency,
      category: item.category as ExpenseCategory,
      merchant: item.merchant,
      spentAt: item.spentAt ? new Date(item.spentAt).toISOString().slice(0, 16) : "",
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
        i.merchant.toLowerCase().includes(q) || 
        (i.notes && i.notes.toLowerCase().includes(q))
      );
    }

    if (dateRange.from) {
      result = result.filter(i => new Date(i.spentAt) >= dateRange.from!);
    }
    if (dateRange.to) {
      const endOfDay = new Date(dateRange.to);
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter(i => new Date(i.spentAt) <= endOfDay);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "newest": return new Date(b.spentAt).getTime() - new Date(a.spentAt).getTime();
        case "oldest": return new Date(a.spentAt).getTime() - new Date(b.spentAt).getTime();
        case "highest": return b.amount - a.amount;
        case "lowest": return a.amount - b.amount;
        default: return 0;
      }
    });

    return result;
  }, [items, searchQuery, dateRange, sortBy]);

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
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-primary" aria-hidden />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight">Expense</CardTitle>
                <CardDescription className="text-base mt-1">
                  Record rent, marketing, utilities, and other spending.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-8 space-y-10">
            {/* Input Form */}
            <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-6 shadow-sm relative overflow-hidden">
              {editingId && (
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              )}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {editingId ? "Edit Entry" : "New Entry"}
                </h3>
                {editingId && (
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditingId(null);
                    form.reset();
                  }}>
                    Cancel Edit
                  </Button>
                )}
              </div>
              
              {!editingId && (
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl"
                    disabled={submitting || scanningReceipt}
                    onClick={() => document.getElementById("receipt-upload-input")?.click()}
                  >
                    {scanningReceipt ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scanning receipt...
                      </>
                    ) : (
                      "Upload Receipt"
                    )}
                  </Button>
                  <input
                    id="receipt-upload-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(event) => void handleReceiptUpload(event)}
                    disabled={submitting || scanningReceipt}
                  />
                  {ocrModelUsed ? (
                    <Badge variant="secondary" className="rounded-lg px-2.5 py-1">
                      {modelBadgeLabel(ocrModelUsed)}
                    </Badge>
                  ) : null}
                </div>
              )}
              
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
                                aria-label="Expense category"
                                suppressHydrationWarning
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
                      name="merchant"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2 lg:col-span-3">
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Merchant / Payee</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Store / Vendor / Service" 
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
                      name="spentAt"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2 lg:col-span-1">
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local" 
                              max={maxDateTime}
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
                              placeholder="Details about this expense" 
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
                      className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 rounded-xl shadow-md min-w-[140px] font-semibold active:scale-[0.98] transition-all" 
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                      {editingId ? "Save Changes" : "Add Entry"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>

            {/* List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Entries</h3>
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
                    <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/50 border border-border/40" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <TrackerEmptyState
                  icon={Inbox}
                  title="No expense entries yet"
                  description="Start tracking your expenses to see insights and manage your spending here."
                  actionLabel="Add your first entry"
                  onAction={() => form.setFocus("amount")}
                />
              ) : filteredItems.length === 0 ? (
                <TrackerEmptyState
                  icon={Inbox}
                  title="No results found"
                  description="No expense entries match your current filters. Try adjusting or clearing them."
                  actionLabel="Clear filters"
                  onAction={clearFilters}
                />
              ) : (
                <div className="overflow-hidden">
                  <AnimatePresence initial={false} mode="popLayout">
                    {filteredItems.map((it) => (
                      <motion.div 
                        layout
                        variants={itemVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        key={it.id} 
                        className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 rounded-2xl border bg-card/60 backdrop-blur-sm transition-all duration-300 hover:shadow-md ${
                          editingId === it.id 
                            ? "border-primary shadow-[0_0_15px_rgba(45,212,191,0.2)] bg-primary/5" 
                            : "border-border/50 hover:bg-muted/30 hover:border-border"
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <Wallet className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-foreground text-base">
                              {it.merchant}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span className="capitalize bg-muted px-2 py-0.5 rounded-md font-medium text-foreground/80">{it.category.replace('_', ' ')}</span>
                              <span>•</span>
                              <span>{formatDate(it.spentAt)}</span>
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
                              -{it.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <TrackerActionMenu
                              onEdit={() => handleEdit(it)}
                              onDelete={() => handleDelete(it.id)}
                              itemName={it.merchant}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.main>
  );
}
