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
export async function sendOTPEmail(to: string, otp: string, subject = "Your Verification Code") {
  try {
    const transporter = getTransporter();
    const cfg = getEmailConfig();
    const isReset = subject.toLowerCase().includes("reset");
    const title = isReset ? "Password Reset Request" : "Account Verification";
    const actionDesc = isReset 
      ? "We received a request to reset your password. Use the code below to complete the process."
      : "Thank you for signing up! Use the code below to verify your email address and activate your account.";

    const info = await transporter.sendMail({
      from: `"${process.env.APP_NAME || "BizDhan"}" <${cfg.from}>`,
      to: to,
      subject: subject,
      text: `Your One-Time Password (OTP) is: ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #eee; border-radius: 20px; background-color: #ffffff; color: #111;">
          <h2 style="color: #000; font-size: 24px; font-weight: 800; margin-bottom: 10px; text-align: center;">${title}</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5; text-align: center; margin-bottom: 30px;">${actionDesc}</p>
          <div style="background-color: #f8f9fa; border: 1px dashed #dee2e6; padding: 20px; text-align: center; border-radius: 12px; margin-bottom: 30px;">
            <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #000;">${otp}</span>
          </div>
          <p style="color: #999; font-size: 13px; text-align: center;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #ccc; font-size: 11px; text-align: center;">&copy; ${new Date().getFullYear()} BizDhan Financial. All rights reserved.</p>
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