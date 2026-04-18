import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/database";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? "unknown";
  try {
    const db = await getDb();
    const { email, otp, newPassword } = await request.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    if (!user.otp || user.otp !== otp) {
      return NextResponse.json({ message: "Invalid OTP" }, { status: 400 });
    }

    if (!user.otpExpires || user.otpExpires < Date.now()) {
      return NextResponse.json({ message: "OTP expired" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db.updateUser(user.id, {
      passwordHash,
      otp: null,
      otpExpires: null,
      is_active: true, // Ensure user is active if they reset password
    });

    return NextResponse.json({ message: "Password reset successful! You can now login." }, { status: 200 });
  } catch (err: unknown) {
    logger.error("Reset password error", {
      requestId,
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}