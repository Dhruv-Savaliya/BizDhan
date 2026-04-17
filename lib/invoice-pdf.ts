import type { InvoiceBillType, InvoiceEntry, InvoiceStatus } from "@/types/invoice";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function billTypeLabel(t: InvoiceBillType) {
  return t === "payable" ? "Bill" : "Invoice";
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

function formatMoney(currency: string, value: number) {
  return `${currency} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export async function buildInvoicePdfDoc(entry: InvoiceEntry) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Colors
  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const secondaryColor: [number, number, number] = [100, 116, 139]; // Slate 500
  const accentColor: [number, number, number] = [14, 165, 233]; // Sky 500

  let currentY = margin;

  // --- Header ---
  // BizDhan Logo/Brand
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...primaryColor);
  doc.text("BizDhan", margin, currentY + 8);

  // Document Type & Number (Right aligned)
  const docType = billTypeLabel(entry.billType).toUpperCase();
  doc.setFontSize(22);
  doc.setTextColor(...secondaryColor);
  doc.text(docType, pageWidth - margin, currentY + 6, { align: "right" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...secondaryColor);
  doc.text(`# ${entry.invoiceNumber}`, pageWidth - margin, currentY + 12, { align: "right" });

  currentY += 25;

  // Header separator line
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 12;

  // --- Metadata Section ---
  doc.setFontSize(10);
  
  // Left: Bill To
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...secondaryColor);
  doc.text(entry.billType === "payable" ? "PAY TO:" : "BILL TO:", margin, currentY);
  
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text(entry.partyName, margin, currentY + 6);
  
  if (entry.clientEmail) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...secondaryColor);
    doc.text(entry.clientEmail, margin, currentY + 12);
  }

  // Right: Details
  const detailsX = pageWidth - margin - 60;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  
  doc.text("Issue Date:", detailsX, currentY);
  doc.text("Due Date:", detailsX, currentY + 6);
  doc.text("Status:", detailsX, currentY + 12);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...primaryColor);
  doc.text(new Date(entry.issuedAt || entry.created_at).toLocaleDateString(), pageWidth - margin, currentY, { align: "right" });
  doc.text(entry.dueAt ? new Date(entry.dueAt).toLocaleDateString() : "—", pageWidth - margin, currentY + 6, { align: "right" });
  
  // Status with pseudo-badge
  const statusStr = statusLabel(entry.status as InvoiceStatus).toUpperCase();
  doc.setFont("helvetica", "bold");
  if (entry.status === "paid") doc.setTextColor(16, 185, 129); // Emerald 500
  else if (entry.status === "overdue") doc.setTextColor(239, 68, 68); // Red 500
  else if (entry.status === "unpaid") doc.setTextColor(245, 158, 11); // Amber 500
  else doc.setTextColor(...secondaryColor);
  
  doc.text(statusStr, pageWidth - margin, currentY + 12, { align: "right" });

  currentY += 25;

  // --- Items Table ---
  const tableData = [
    [
      entry.itemName || "Consulting / Services / Goods",
      entry.quantity?.toString() || "1",
      formatMoney(entry.currency, entry.amount / (entry.quantity || 1)),
      formatMoney(entry.currency, entry.amount),
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    head: [["DESCRIPTION", "QTY", "RATE", "AMOUNT"]],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: [248, 250, 252], // Slate 50
      textColor: [100, 116, 139], // Slate 500
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 4,
    },
    bodyStyles: {
      textColor: [15, 23, 42],
      fontSize: 10,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 40, halign: "right" },
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255]
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      currentY = data.cursor?.y || currentY;
    }
  });

  currentY += 5;

  // Table bottom border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // --- Total Summary ---
  const summaryX = pageWidth - margin - 75;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.text("Subtotal:", summaryX, currentY);
  doc.setTextColor(...primaryColor);
  doc.text(formatMoney(entry.currency, entry.amount), pageWidth - margin, currentY, { align: "right" });
  
  currentY += 8;
  
  // Total line
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.5);
  doc.line(summaryX, currentY - 4, pageWidth - margin, currentY - 4);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text("Total Due:", summaryX, currentY);
  
  doc.setFontSize(14);
  doc.setTextColor(...accentColor);
  doc.text(formatMoney(entry.currency, entry.amount), pageWidth - margin, currentY + 0.5, { align: "right" });

  currentY += 20;

  // --- Notes Section ---
  if (entry.notes?.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...secondaryColor);
    doc.text("Notes / Terms:", margin, currentY);
    
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...secondaryColor);
    const noteLines = doc.splitTextToSize(entry.notes.trim(), pageWidth - margin * 2 - 80);
    doc.text(noteLines, margin, currentY);
  }

  // --- Footer ---
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(`Generated by BizDhan on ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 15, { align: "center" });

  return doc;
}

export async function downloadInvoicePdf(entry: InvoiceEntry) {
  const doc = await buildInvoicePdfDoc(entry);
  const safe =
    entry.invoiceNumber.replace(/[^\w\-.]+/g, "_").replace(/^_|_$/g, "").slice(0, 80) ||
    "invoice";
  doc.save(`${safe}.pdf`);
}
