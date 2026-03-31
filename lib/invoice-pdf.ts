import type { InvoiceBillType, InvoiceEntry, InvoiceStatus } from "@/types/invoice";

function billTypeLabel(t: InvoiceBillType) {
  return t === "payable" ? "Bill to pay (payable)" : "Invoice issued (receivable)";
}

function statusLabel(s: InvoiceStatus) {
  const map: Record<InvoiceStatus, string> = {
    draft: "Draft",
    unpaid: "Unpaid",
    partial: "Partial",
    paid: "Paid",
    overdue: "Overdue",
  };
  return map[s];
}

export async function downloadInvoicePdf(entry: InvoiceEntry) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const labelW = 52;
  const valueW = pageW - margin * 2 - labelW;
  let y = 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Invoice / Bill", margin, y);
  y += 12;

  doc.setFontSize(10);
  const pairs: [string, string][] = [
    ["Document no.", entry.invoiceNumber],
    ["Party", entry.partyName],
    ["Type", billTypeLabel(entry.billType)],
    [
      "Amount",
      `${entry.currency} ${entry.amount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`,
    ],
    ["Status", statusLabel(entry.status)],
    ["Issue date", new Date(entry.issuedAt).toLocaleString()],
  ];
  if (entry.dueAt) {
    pairs.push(["Due date", new Date(entry.dueAt).toLocaleString()]);
  }

  for (const [label, value] of pairs) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, valueW);
    doc.text(lines, margin + labelW, y);
    y += Math.max(7, lines.length * 5 + 1);
  }

  if (entry.notes?.trim()) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Notes:", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(entry.notes.trim(), pageW - margin * 2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5 + 4;
  }

  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, y);

  const safe =
    entry.invoiceNumber.replace(/[^\w\-.]+/g, "_").replace(/^_|_$/g, "").slice(0, 80) ||
    "invoice";
  doc.save(`${safe}.pdf`);
}
