import nodemailer from "nodemailer";
import type { InvoiceEntry } from "@/types/invoice";

function getEmailConfig() {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || "";
  const portRaw = process.env.EMAIL_PORT || process.env.SMTP_PORT || "";
  const user = process.env.EMAIL_USER || process.env.SMTP_USER || "";
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS || "";
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || user;

  const missing: string[] = [];
  if (!host) missing.push("EMAIL_HOST|SMTP_HOST");
  if (!portRaw) missing.push("EMAIL_PORT|SMTP_PORT");
  if (!user) missing.push("EMAIL_USER|SMTP_USER");
  if (!pass) missing.push("EMAIL_PASS|SMTP_PASS");
  if (!from) missing.push("EMAIL_FROM|SMTP_FROM|SMTP_USER");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for email: ${missing.join(", ")}`
    );
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("Invalid email port. Set EMAIL_PORT or SMTP_PORT correctly.");
  }

  return { host, port, user, pass, from };
}

function getTransporter() {
  const cfg = getEmailConfig();
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });
}

/**
 * Sends a One-Time Password (OTP) email to a specified recipient.
 * @param to The recipient's email address.
 * @param otp The 6-digit code to be sent.
 */
export async function sendOTPEmail(to: string, otp: string) {
  try {
    const transporter = getTransporter();
    const cfg = getEmailConfig();
    const info = await transporter.sendMail({
      from: `"${process.env.APP_NAME || "Your App"}" <${cfg.from}>`,
      to: to,
      subject: "Your Password Reset Code",
      text: `Your One-Time Password (OTP) for resetting your password is: ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>We received a request to reset your password. Use the code below to complete the process.</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
            ${otp}
          </p>
          <p>This code will expire in 10 minutes. If you did not request a password reset, please ignore this email.</p>
        </div>
      `,
    });

    console.log("Message sent successfully: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);

    throw new Error("Failed to send the password reset email.");
  }
}

export async function sendInvoiceEmail(params: {
  to: string;
  invoice: InvoiceEntry;
  pdfBuffer: Buffer;
}) {
  try {
    const transporter = getTransporter();
    const cfg = getEmailConfig();
    const safeInvoiceName =
      params.invoice.invoiceNumber
        .replace(/[^\w\-.]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 80) || "invoice";

    await transporter.sendMail({
      from: `"${process.env.APP_NAME || "Your App"}" <${cfg.from}>`,
      to: params.to,
      subject: `Invoice ${params.invoice.invoiceNumber}`,
      text: `Hello,\n\nPlease find your invoice ${params.invoice.invoiceNumber} attached.\n\nAmount: ${params.invoice.currency} ${params.invoice.amount.toLocaleString()}\nStatus: ${params.invoice.status}\n\nThank you.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #333;">Invoice ${params.invoice.invoiceNumber}</h2>
          <p>Please find your invoice attached as PDF.</p>
          <p><strong>Party:</strong> ${params.invoice.partyName}</p>
          <p><strong>Amount:</strong> ${params.invoice.currency} ${params.invoice.amount.toLocaleString()}</p>
          <p><strong>Status:</strong> ${params.invoice.status}</p>
        </div>
      `,
      attachments: [
        {
          filename: `${safeInvoiceName}.pdf`,
          content: params.pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
  } catch (error) {
    console.error("Error sending invoice email:", error);
    throw new Error("Failed to send invoice email.");
  }
}