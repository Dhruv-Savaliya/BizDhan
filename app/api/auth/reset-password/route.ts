import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/database";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? "unknown";

  try {
    const db = await getDb();
    const { email, otp, password } = await request.json();

    if (!email || !otp || !password) {
      return NextResponse.json({ message: "Missing data" }, { status: 400 });
    }

    const user = await db.findUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { message: "Invalid or expired session" },
        { status: 400 }
      );
    }

    if (
      !user.otp ||
      user.otp !== otp ||
      !user.otpExpires ||
      Date.now() > user.otpExpires
    ) {
      return NextResponse.json(
        { message: "Invalid or expired session" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.updateUser(user.id, {
      passwordHash,
      otp: null,
      otpExpires: null,
    });

    return NextResponse.json(
      { message: "Password reset successful" },
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