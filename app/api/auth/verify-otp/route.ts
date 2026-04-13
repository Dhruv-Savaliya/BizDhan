import { NextResponse } from "next/server";
import { getDb } from "@/lib/database";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? "unknown";

  try {
    const db = await getDb();
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { message: "Email and OTP required" },
        { status: 400 }
      );
    }

    const user = await db.findUserByEmail(email);

    if (!user || !user.otp || !user.otpExpires) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    if (Date.now() > user.otpExpires) {
      return NextResponse.json({ message: "OTP has expired" }, { status: 400 });
    }

    if (user.otp !== otp) {
      return NextResponse.json({ message: "Invalid OTP" }, { status: 400 });
    }

    return NextResponse.json({ message: "OTP verified" }, { status: 200 });
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