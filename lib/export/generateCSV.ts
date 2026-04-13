import type { FinancialExportData } from "@/lib/export/aggregateFinancials";

const BOM = "\uFEFF";

function escapeCsvString(value: string): string {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

function formatDateDDMMYYYY(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function csvRow(values: Array<string | number>): string {
  return values
    .map((value) => (typeof value === "string" ? escapeCsvString(value) : String(value)))
    .join(",");
}

export function generateCSV(data: FinancialExportData): string {
  const lines: string[] = [];

  lines.push(csvRow(["BizDhan Financial Report"]));
  lines.push(csvRow(["Period", data.period.label]));
  lines.push(csvRow(["Workspace", data.workspace.name]));
  lines.push("");

  lines.push(csvRow(["Summary"]));
  lines.push(csvRow(["Total Income", formatAmount(data.summary.totalIncome)]));
  lines.push(csvRow(["Total Expense", formatAmount(data.summary.totalExpense)]));
  lines.push(csvRow(["Net Profit", formatAmount(data.summary.netProfit)]));
  lines.push(csvRow(["Total GST", formatAmount(data.summary.totalGST)]));
  lines.push("");

  lines.push(
    csvRow([
      "Date",
      "Type",
      "Category",
      "Description",
      "Amount (INR)",
      "GST Rate (%)",
      "GST Amount (INR)",
      "Net Amount (INR)",
    ])
  );

  for (const transaction of data.transactions) {
    lines.push(
      csvRow([
        formatDateDDMMYYYY(transaction.date),
        transaction.type,
        transaction.category,
        transaction.description,
        formatAmount(transaction.amount),
        formatAmount(transaction.gstRate),
        formatAmount(transaction.gstAmount),
        formatAmount(transaction.netAmount),
      ])
    );
  }

  lines.push("");
  lines.push(csvRow(["INVOICES"]));
  lines.push(csvRow(["Invoice No", "Client", "Amount", "Due Date", "Status"]));

  for (const invoice of data.invoices) {
    lines.push(
      csvRow([
        invoice.invoiceNo,
        invoice.client,
        formatAmount(invoice.amount),
        formatDateDDMMYYYY(invoice.dueDate),
        invoice.status,
      ])
    );
  }

  return `${BOM}${lines.join("\n")}`;
}
