"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Loader2, Sparkles, BarChart3, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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

function fmt(currency: string, n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}${currency} ${abs.toLocaleString()}`;
}

const barChartConfig = {
  total: {
    label: "Amount",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

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

  const primaryCurrency = useMemo(() => {
    if (!report) return "USD";
    const e = report.tables.topExpenseCategories[0]?.currency;
    const i = report.tables.topIncomeSources[0]?.currency;
    const k = report.kpis[0]?.currency;
    return e ?? i ?? k ?? "USD";
  }, [report]);

  const expenseChartData = useMemo(() => {
    if (!report) return [];
    return report.tables.topExpenseCategories
      .filter((r) => r.currency === primaryCurrency)
      .map((r) => ({ name: r.category, total: r.total }));
  }, [report, primaryCurrency]);

  const incomeChartData = useMemo(() => {
    if (!report) return [];
    return report.tables.topIncomeSources
      .filter((r) => r.currency === primaryCurrency)
      .map((r) => ({ name: r.source, total: r.total }));
  }, [report, primaryCurrency]);

  return (
    <motion.main 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="pb-10 pt-4"
    >
      <div className="mx-auto w-full max-w-5xl">
        <Card className="glass shadow-xl rounded-[2rem] border-primary/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -z-10" />
          
          <CardHeader className="px-8 pt-8 pb-6 border-b border-border/50 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-fuchsia-500" aria-hidden />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold tracking-tight">AI Financial Report</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Generate AI summaries and analytics from your tracker data.
                  </CardDescription>
                </div>
              </div>

              <div className="flex gap-3 mt-2 sm:mt-0">
                <AnimatePresence>
                  {raw && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setRaw("");
                          setReport(null);
                          setUsedDataFallback(false);
                        }}
                        disabled={loading}
                        className="rounded-xl h-11 shadow-sm transition-all text-muted-foreground hover:text-foreground border-border/50 bg-background/50 hover:bg-muted"
                      >
                        Reset
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Button
                  type="button"
                  onClick={() => void generate()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 px-6 shadow-md transition-all active:scale-[0.98] font-semibold space-x-2"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span>{report ? "Regenerate" : "Generate Report"}</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8 space-y-10 min-h-[300px]">
            {usedDataFallback && report ? (
              <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-500 rounded-xl">
                <AlertCircle className="h-4 w-4 !text-amber-500 top-1/2 -translate-y-1/2" />
                <AlertTitle className="font-semibold text-amber-500">Structured Data View</AlertTitle>
                <AlertDescription className="text-amber-500/90 text-sm">
                  The model did not return parseable JSON. KPIs, charts, and tables map to native tracker totals.
                </AlertDescription>
              </Alert>
            ) : null}

            {loading && !report ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 scale-150 blur-3xl bg-fuchsia-500/20 rounded-full animate-pulse" />
                  <Loader2 className="h-10 w-10 text-primary animate-spin relative z-10" />
                </div>
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Running AI pipeline analysis...</p>
              </div>
            ) : report ? (
              <motion.div 
                className="space-y-12"
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.1 } } }}
              >
                {/* Title */}
                <motion.div variants={sectionVariants} className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-6 shadow-sm ring-1 ring-inset ring-fuchsia-500/10 relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-[40px] -z-10" />
                  <h2 className="text-2xl font-black tracking-tighter text-foreground">{report.title}</h2>
                  <p className="mt-1 text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-fuchsia-400" /> Generated {new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short" }).format(new Date(report.generatedAt))}
                  </p>
                </motion.div>

                {/* KPIs */}
                {report.kpis.length > 0 ? (
                  <motion.section variants={sectionVariants} className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> Key Metrics
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {report.kpis.map((k, idx) => (
                        <div
                          key={`${k.label}-${idx}`}
                          className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 shadow-sm hover:border-fuchsia-500/30 transition-colors group"
                        >
                          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-fuchsia-500/80 transition-colors">
                            {k.label}
                          </div>
                          <div className="mt-2 text-3xl font-black tabular-nums tracking-tighter text-foreground">
                            {fmt(k.currency, k.value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.section>
                ) : null}

                {/* Main AI Insights */}
                {report.executiveSummary.length > 0 && (
                  <motion.section variants={sectionVariants} className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Executive Summary</h3>
                    <div className="rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-sm shadow-sm">
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
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      Data Visualizations <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">{primaryCurrency}</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      
                      {expenseChartData.length > 0 && (
                        <div className="space-y-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 shadow-sm">
                          <div className="text-sm font-semibold text-foreground">Top Expense Categories</div>
                          <ChartContainer config={barChartConfig} className="h-[220px] w-full">
                            <BarChart accessibilityLayer data={expenseChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.2)" />
                              <XAxis
                                dataKey="name"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                className="text-xs text-muted-foreground font-medium"
                              />
                              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                              <Bar dataKey="total" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={48} />
                            </BarChart>
                          </ChartContainer>
                        </div>
                      )}

                      {incomeChartData.length > 0 && (
                        <div className="space-y-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 shadow-sm">
                          <div className="text-sm font-semibold text-foreground">Top Income Sources</div>
                          <ChartContainer config={barChartConfig} className="h-[220px] w-full">
                            <BarChart accessibilityLayer data={incomeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.2)" />
                              <XAxis
                                dataKey="name"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                className="text-xs text-muted-foreground font-medium"
                              />
                              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                              <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={48} />
                            </BarChart>
                          </ChartContainer>
                        </div>
                      )}

                    </div>
                  </motion.section>
                )}

                {/* Categorized AI output blocks */}
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
                <motion.section variants={sectionVariants} className="space-y-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Detailed Data</h3>
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
                        r.category,
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

                {/* Debug Fallback */}
                {raw && !report ? (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 backdrop-blur-sm">
                    <h3 className="text-sm font-semibold text-destructive flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Parse Error</h3>
                    <p className="mt-1 text-sm text-destructive/80">
                      The AI returned a response that could not be mapped to structured objects.
                    </p>
                    <Collapsible className="mt-4">
                      <CollapsibleTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="bg-background/50 border-destructive/20 text-destructive hover:bg-destructive/10">
                          View Raw AI Response
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3">
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-destructive/20 bg-background/50 p-4 text-xs font-mono leading-relaxed text-destructive/90">
                          {raw}
                        </pre>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                ) : raw && report && usedDataFallback ? (
                  <Collapsible className="rounded-2xl border border-border/50 bg-muted/20">
                    <CollapsibleTrigger asChild>
                      <Button type="button" variant="ghost" className="w-full justify-between px-6 py-4 h-auto text-sm font-medium text-muted-foreground hover:text-foreground">
                        Raw AI response (Debug)
                        <span className="text-[10px] uppercase tracking-widest bg-muted px-2 py-1 rounded-sm">Expand</span>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre className="max-h-48 overflow-auto whitespace-pre-wrap border-t border-border/50 px-6 py-4 text-xs font-mono leading-relaxed text-muted-foreground bg-background/50 rounded-b-2xl">
                        {raw}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                ) : null}

              </motion.div>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 py-12 text-center rounded-2xl border border-dashed border-border/70 bg-muted/20">
                <div className="w-16 h-16 rounded-full bg-fuchsia-500/10 flex items-center justify-center -mb-2">
                  <Sparkles className="h-8 w-8 text-fuchsia-500/50" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">No Report Generated</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-[250px] mx-auto">
                    Click &ldquo;Generate Report&rdquo; above to construct AI insights from your workspace entries.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.main>
  );
}

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
      ? "border-fuchsia-500/20 bg-fuchsia-500/5 shadow-sm"
      : variant === "muted"
        ? "border-border/50 bg-background/30 shadow-sm"
        : "border-border/50 bg-card/60 shadow-sm";
  return (
    <section className={`rounded-2xl border backdrop-blur-sm overflow-hidden ${ring}`}>
      <div className={`px-5 py-3 border-b flex items-center gap-2 ${variant === 'accent' ? 'border-fuchsia-500/20 bg-fuchsia-500/10' : 'border-border/50 bg-muted/20'}`}>
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
    <section className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col shadow-sm">
      <div className="px-5 py-3 border-b border-border/50 bg-muted/20">
         <h3 className="text-sm tracking-widest uppercase font-bold text-muted-foreground">{props.title}</h3>
      </div>
      <div className="flex-1 w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border/50 bg-background/50">
            <tr>
              {props.columns.map((c) => (
                <th key={c} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {props.rows.map((r, idx) => (
              <tr key={idx} className="hover:bg-muted/30 transition-colors">
                {r.map((cell, i) => (
                  <td
                    key={i}
                    className={`px-5 py-3 ${i === props.columns.length - 1 ? "text-right font-medium tabular-nums text-foreground" : i === 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}
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
