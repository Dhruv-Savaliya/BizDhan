import { NextResponse } from "next/server";
import { getDb } from "@/lib/database";
import { sendOTPEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? "unknown";

  try {
    const db = await getDb();
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    const user = await db.findUserByEmail(email);

    if (user) {
      const otp = crypto.randomInt(100000, 999999).toString();
      const otpExpires = Date.now() + 10 * 60 * 1000;

      await db.updateUser(user.id, { otp, otpExpires });

      try {
        await sendOTPEmail(user.email, otp);
      } catch (emailError: unknown) {
        logger.error("Unhandled error", {
          requestId,
          error: emailError instanceof Error ? emailError.message : "Unknown error",
          stack: emailError instanceof Error ? emailError.stack : undefined,
        });
        return NextResponse.json(
          { error: "Internal server error", requestId },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { message: "If an account exists, an OTP has been sent." },
      { status: 200 }
    );
  } catch (err: unknown) {
    logger.error("Unhandled error", {
      requestId,
      error: err instanceof Error ? err.message : "Unknown error",
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500 }
    );
  }
}