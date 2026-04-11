"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";
import {
  Loader2,
  Sparkles,
  BarChart3,
  AlertCircle,
  FileText,
  Copy,
  Download,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { TrackerStats } from "@/lib/report";
import {
  parseReportFromLlmText,
  reportFromTrackerStats,
  type ReportJson,
} from "@/lib/report-parse";

/* ═══════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════ */

function fmt(currency: string, n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}${currency} ${abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/* ═══════════════════════════════════════════════════
   Animations
   ═══════════════════════════════════════════════════ */

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

/* ═══════════════════════════════════════════════════
   Custom Chart Tooltip
   ═══════════════════════════════════════════════════ */

function ChartTooltipContent({ active, payload, label, currency }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-popover border border-border shadow-lg p-3 text-xs space-y-1.5">
      <p className="font-semibold text-foreground capitalize">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-bold ml-auto tabular-nums">
            {fmt(currency, p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════ */

export default function ReportPage() {
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState<string>("");
  const [report, setReport] = useState<ReportJson | null>(null);
  const [usedDataFallback, setUsedDataFallback] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/tracker/report", { method: "POST" });
      const data = (await res.json()) as {
        report?: string;
        stats?: TrackerStats;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message || "Failed to generate report");

      const text = String(data.report ?? "");
      setRaw(text);

      const parsed = parseReportFromLlmText(text);
      const stats = data.stats;

      if (parsed) {
        setReport(parsed);
        setUsedDataFallback(false);
        toast.success("AI Report generated successfully");
      } else if (stats) {
        setReport(reportFromTrackerStats(stats));
        setUsedDataFallback(true);
        toast.message("Structured data view loaded", {
          description: "Used fallback rendering from available trackers as AI response wasn't purely formatted.",
        });
      } else {
        setReport(null);
        setUsedDataFallback(false);
        toast.error("Could not build an AI report");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to generate report";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function copyReport() {
    if (!raw) return;
    try {
      await navigator.clipboard.writeText(raw);
      toast.success("Copied!");
    } catch {
      toast.error("Failed to copy");
    }
  }

  async function exportPdf() {
    if (!report) return;
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const margin = 20;
      const pageW = doc.internal.pageSize.getWidth();
      let y = 22;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(report.title, margin, y);
      y += 10;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, margin, y);
      y += 12;
      doc.setTextColor(0);

      // Executive Summary
      if (report.executiveSummary.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Executive Summary", margin, y);
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        for (const line of report.executiveSummary) {
          const lines = doc.splitTextToSize(`• ${line.replace(/\*\*/g, "")}`, pageW - margin * 2);
          doc.text(lines, margin, y);
          y += lines.length * 5 + 2;
          if (y > 270) { doc.addPage(); y = 20; }
        }
        y += 4;
      }

      // KPIs
      if (report.kpis.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Key Metrics", margin, y);
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        for (const k of report.kpis) {
          doc.text(`${k.label}: ${fmt(k.currency, k.value)}`, margin, y);
          y += 6;
          if (y > 270) { doc.addPage(); y = 20; }
        }
        y += 4;
      }

      // Sections
      const sections = [
        { title: "Highlights", items: report.highlights },
        { title: "Risks", items: report.risks },
        { title: "Recommendations", items: report.recommendations },
        { title: "Next Steps", items: report.nextSteps },
      ];
      for (const sec of sections) {
        if (sec.items.length === 0) continue;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(sec.title, margin, y);
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        for (const line of sec.items) {
          const lines = doc.splitTextToSize(`• ${line.replace(/\*\*/g, "")}`, pageW - margin * 2);
          doc.text(lines, margin, y);
          y += lines.length * 5 + 2;
          if (y > 270) { doc.addPage(); y = 20; }
        }
        y += 4;
      }

      doc.save("financial-report.pdf");
      toast.success("PDF exported!");
    } catch {
      toast.error("Failed to export PDF");
    }
  }

  const primaryCurrency = useMemo(() => {
    if (!report) return "INR";
    const e = report.tables.topExpenseCategories[0]?.currency;
    const i = report.tables.topIncomeSources[0]?.currency;
    const k = report.kpis[0]?.currency;
    return e ?? i ?? k ?? "INR";
  }, [report]);

  const expenseChartData = useMemo(() => {
    if (!report) return [];
    return report.tables.topExpenseCategories
      .filter((r) => r.currency === primaryCurrency)
      .map((r) => ({ name: r.category.replace(/_/g, " "), total: r.total }));
  }, [report, primaryCurrency]);

  const incomeChartData = useMemo(() => {
    if (!report) return [];
    return report.tables.topIncomeSources
      .filter((r) => r.currency === primaryCurrency)
      .map((r) => ({ name: r.source, total: r.total }));
  }, [report, primaryCurrency]);

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
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">AI Financial Report</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Generate AI summaries and analytics from your tracker data.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <AnimatePresence>
              {raw && report && (
                <motion.div className="flex gap-2" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void copyReport()}
                    className="rounded-xl gap-2 text-muted-foreground hover:text-foreground border-border/60"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Copy</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void exportPdf()}
                    className="rounded-xl gap-2 text-muted-foreground hover:text-foreground border-border/60"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Export PDF</span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {raw && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setRaw(""); setReport(null); setUsedDataFallback(false); }}
                    disabled={loading}
                    className="rounded-xl text-muted-foreground hover:text-foreground border-border/60"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="button"
              size="sm"
              onClick={() => void generate()}
              className="rounded-xl gap-2 shadow-md font-semibold"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {report ? "Regenerate" : "Generate Report"}
            </Button>
          </div>
        </motion.div>

        {/* Fallback Alert */}
        {usedDataFallback && report && (
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-500 rounded-xl">
              <AlertCircle className="h-4 w-4 !text-amber-500" />
              <AlertTitle className="font-semibold text-amber-500">Structured Data View</AlertTitle>
              <AlertDescription className="text-amber-500/90 text-sm">
                The model did not return parseable JSON. KPIs, charts, and tables map to native tracker totals.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* ── Loading State ── */}
        {loading && !report && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
            {/* Shimmer over report area */}
            <div className="rounded-2xl border border-border/30 bg-muted/10 p-6 space-y-4">
              <div className="h-8 w-64 animate-pulse rounded-xl bg-muted/50" />
              <div className="h-5 w-48 animate-pulse rounded-lg bg-muted/40" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/40 border border-border/30" />
              ))}
            </div>
            <div className="rounded-2xl border border-border/30 bg-muted/10 p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-5 animate-pulse rounded-lg bg-muted/30" style={{ width: `${85 - i * 10}%` }} />
              ))}
            </div>
            <div className="flex items-center justify-center gap-3 py-4">
              <div className="relative">
                <div className="absolute inset-0 scale-150 blur-3xl bg-fuchsia-500/20 rounded-full animate-pulse" />
                <Loader2 className="h-8 w-8 text-fuchsia-500 animate-spin relative z-10" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground animate-pulse">
                Generating AI analysis...
              </span>
            </div>
          </motion.div>
        )}

        {/* ── Empty State ── */}
        {!loading && !report && !raw && (
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <Card className="rounded-2xl border-dashed border-border/60 bg-muted/10">
              <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-4 py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-fuchsia-500/50" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">No Report Generated</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                    Generate your first report to get AI-powered insights from your financial data.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => void generate()}
                  disabled={loading}
                  className="rounded-xl gap-2 shadow-md font-semibold mt-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Report Content ── */}
        {report && (
          <motion.div
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {/* Title block */}
            <motion.div variants={sectionVariants} className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-6 shadow-sm ring-1 ring-inset ring-fuchsia-500/10 relative overflow-hidden backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-[40px] -z-10" />
              <h2 className="text-2xl font-black tracking-tighter text-foreground">{report.title}</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-fuchsia-400" /> Generated {new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short" }).format(new Date(report.generatedAt))}
              </p>
            </motion.div>

            {/* KPIs */}
            {report.kpis.length > 0 && (
              <motion.section variants={sectionVariants} className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 px-1">
                  <BarChart3 className="w-4 h-4" /> Key Metrics
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {report.kpis.map((k, idx) => (
                    <div
                      key={`${k.label}-${idx}`}
                      className="group rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-6 shadow-sm hover:border-fuchsia-500/30 transition-all duration-300 hover:shadow-lg"
                    >
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-fuchsia-500/80 transition-colors">
                        {k.label}
                      </div>
                      <div className="mt-2 text-2xl font-black tabular-nums tracking-tight text-foreground">
                        {fmt(k.currency, k.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Executive Summary */}
            {report.executiveSummary.length > 0 && (
              <motion.section variants={sectionVariants} className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Executive Summary</h3>
                <div className="rounded-2xl border border-border/40 bg-card/70 p-6 backdrop-blur-sm shadow-sm">
                  <ul className="space-y-3">
                    {report.executiveSummary.map((t, i) => (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + (i * 0.1) }}
                        key={i}
                      >
                        <BoldPoint text={t} />
                      </motion.div>
                    ))}
                  </ul>
                </div>
              </motion.section>
            )}

            {/* Charts */}
            {(expenseChartData.length > 0 || incomeChartData.length > 0) && (
              <motion.section variants={sectionVariants} className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 px-1">
                  Data Visualizations
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-muted">
                    {primaryCurrency}
                  </Badge>
                </h3>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {expenseChartData.length > 0 && (
                    <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5 shadow-sm space-y-3">
                      <h4 className="text-sm font-bold text-foreground">Top Expense Categories</h4>
                      <p className="text-[11px] text-muted-foreground -mt-1">Amount spent per category in {primaryCurrency}</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={expenseChartData} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                          <XAxis
                            dataKey="name"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontWeight: 500 }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                          />
                          <ReTooltip content={<ChartTooltipContent currency={primaryCurrency} />} cursor={false} />
                          <Bar dataKey="total" name="Amount" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={48} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {incomeChartData.length > 0 && (
                    <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5 shadow-sm space-y-3">
                      <h4 className="text-sm font-bold text-foreground">Top Income Sources</h4>
                      <p className="text-[11px] text-muted-foreground -mt-1">Revenue per source in {primaryCurrency}</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={incomeChartData} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                          <XAxis
                            dataKey="name"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontWeight: 500 }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                          />
                          <ReTooltip content={<ChartTooltipContent currency={primaryCurrency} />} cursor={false} />
                          <Bar dataKey="total" name="Amount" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={48} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </motion.section>
            )}

            {/* Categorized AI blocks */}
            <motion.div variants={sectionVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <BulletBlock title="Highlights" items={report.highlights} variant="accent" icon={<Sparkles className="w-4 h-4 text-fuchsia-500" />} />
                <BulletBlock title="Risks" items={report.risks} variant="muted" icon={<AlertCircle className="w-4 h-4 text-destructive" />} />
              </div>
              <div className="space-y-6">
                <BulletBlock title="Recommendations" items={report.recommendations} variant="accent" />
                <BulletBlock title="Next Steps" items={report.nextSteps} variant="default" />
              </div>
            </motion.div>

            {/* Data Tables */}
            <motion.section variants={sectionVariants} className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Detailed Data</h3>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <DataTable
                  title="Top Income Sources"
                  columns={["Source", "Currency", "Total"]}
                  rows={report.tables.topIncomeSources.map((r) => [
                    r.source,
                    r.currency,
                    fmt(r.currency, r.total),
                  ])}
                />
                <DataTable
                  title="Top Expense Categories"
                  columns={["Category", "Currency", "Total"]}
                  rows={report.tables.topExpenseCategories.map((r) => [
                    r.category.replace(/_/g, " "),
                    r.currency,
                    fmt(r.currency, r.total),
                  ])}
                />
                <DataTable
                  title="Top Expense Merchants"
                  columns={["Merchant", "Currency", "Total"]}
                  rows={report.tables.topExpenseMerchants.map((r) => [
                    r.merchant,
                    r.currency,
                    fmt(r.currency, r.total),
                  ])}
                />
                <DataTable
                  title="Investment Allocation"
                  columns={["Type", "Currency", "Total"]}
                  rows={report.tables.investmentByType.map((r) => [
                    r.type,
                    r.currency,
                    fmt(r.currency, r.total),
                  ])}
                />
              </div>
            </motion.section>

            {/* Raw AI Response */}
            {raw && !report ? (
              <motion.div variants={sectionVariants} className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-destructive flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Parse Error</h3>
                <p className="mt-1 text-sm text-destructive/80">
                  The AI returned a response that could not be mapped to structured objects.
                </p>
                <Collapsible className="mt-4">
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="bg-background/50 border-destructive/20 text-destructive hover:bg-destructive/10 rounded-xl">
                      View Raw AI Response
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-destructive/20 bg-muted p-6 font-mono text-xs leading-relaxed text-muted-foreground">
                      {raw}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            ) : raw && report && usedDataFallback ? (
              <motion.div variants={sectionVariants}>
                <Collapsible className="rounded-2xl border border-border/40">
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="ghost" className="w-full justify-between px-6 py-4 h-auto text-sm font-medium text-muted-foreground hover:text-foreground rounded-2xl">
                      Raw AI response (Debug)
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wider bg-muted font-bold">Expand</Badge>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap border-t border-border/40 px-6 py-4 font-mono text-xs leading-relaxed text-muted-foreground bg-muted rounded-b-2xl">
                      {raw}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            ) : null}
          </motion.div>
        )}
      </div>
    </motion.main>
  );
}

/* ═══════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════ */

function BoldPoint({ text }: { text: string }) {
  const highlightRegex = /\*\*(.*?)\*\*/g;

  if (text.includes('**')) {
    const parts = text.split(highlightRegex);
    return (
      <li className="flex items-start gap-3">
        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-fuchsia-500 shrink-0" />
        <span className="text-sm leading-relaxed text-foreground/90">
          {parts.map((part, i) => (
             i % 2 === 1 ? <span key={i} className="font-bold text-foreground">{part}</span> : part
          ))}
        </span>
      </li>
    );
  }

  const idx = text.indexOf(":");
  if (idx > 0 && idx < 72) {
    return (
      <li className="flex items-start gap-3">
        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-fuchsia-500 shrink-0" />
        <span className="text-sm leading-relaxed text-foreground/90">
          <span className="font-bold text-foreground">{text.slice(0, idx + 1)}</span>
          <span className="text-foreground/80">{text.slice(idx + 1)}</span>
        </span>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-fuchsia-500 shrink-0" />
      <span className="text-sm text-foreground/90 leading-relaxed font-medium">
        {text}
      </span>
    </li>
  );
}

function BulletBlock({
  title,
  items,
  variant,
  icon
}: {
  title: string;
  items: string[];
  variant: "default" | "muted" | "accent";
  icon?: React.ReactNode;
}) {
  if (!items?.length) return null;
  const ring =
    variant === "accent"
      ? "border-fuchsia-500/20 bg-fuchsia-500/5"
      : variant === "muted"
        ? "border-border/40 bg-background/30"
        : "border-border/40 bg-card/70";
  return (
    <section className={`rounded-2xl border backdrop-blur-sm overflow-hidden shadow-sm ${ring}`}>
      <div className={`px-5 py-3 border-b flex items-center gap-2 ${variant === 'accent' ? 'border-fuchsia-500/20 bg-fuchsia-500/10' : 'border-border/40 bg-muted/20'}`}>
        {icon}
        <h3 className={`text-sm tracking-wider uppercase font-bold ${variant === 'accent' ? 'text-fuchsia-600 dark:text-fuchsia-400' : 'text-muted-foreground'}`}>{title}</h3>
      </div>
      <div className="p-5">
        <ul className="space-y-3">
          {items.map((t, i) => (
            <BoldPoint key={i} text={t} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function DataTable(props: { title: string; columns: string[]; rows: string[][] }) {
  if (!props.rows?.length) return null;
  return (
    <section className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm overflow-hidden flex flex-col shadow-sm">
      <div className="px-5 py-3 border-b border-border/40 bg-muted/20">
         <h3 className="text-sm tracking-widest uppercase font-bold text-muted-foreground">{props.title}</h3>
      </div>
      <div className="flex-1 w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border/40 bg-muted/10">
            <tr>
              {props.columns.map((c) => (
                <th key={c} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {props.rows.map((r, idx) => (
              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                {r.map((cell, i) => (
                  <td
                    key={i}
                    className={`px-5 py-3 ${i === props.columns.length - 1 ? "text-right font-semibold tabular-nums text-foreground" : i === 0 ? "font-medium text-foreground capitalize" : "text-muted-foreground"}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
