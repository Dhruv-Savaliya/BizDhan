import { NextResponse } from "next/server";
import { getDb } from "@/lib/database";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? "unknown";
  try {
    const db = await getDb();
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      // For security, don't reveal if user exists. Just say "If an account exists..."
      return NextResponse.json({ message: "If an account exists with this email, you will receive an OTP." }, { status: 200 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await db.updateUser(user.id, {
      otp,
      otpExpires,
    });

    try {
      const { sendOTPEmail } = await import("@/lib/email");
      await sendOTPEmail(user.email, otp, "Password Reset Code");
    } catch (err) {
      logger.error("Forgot password email error", { error: err });
      return NextResponse.json({ message: "Failed to send email. Please try again later." }, { status: 500 });
    }

    return NextResponse.json({ message: "OTP sent to your email." }, { status: 200 });
  } catch (err: unknown) {
    logger.error("Forgot password error", {
      requestId,
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}