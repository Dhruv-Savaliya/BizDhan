import { NextResponse } from "next/server";
import { getDb } from "@/lib/database";
import { signAuthToken } from "@/lib/jwt";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? "unknown";
  try {
    const db = await getDb();
    const { userId, email, otp } = await request.json();

    if (!otp || (!userId && !email)) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const user = userId 
      ? await db.findUserById(userId) 
      : await db.findUserByEmail(email);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (!user.otp || user.otp !== otp) {
      return NextResponse.json({ message: "Invalid OTP" }, { status: 400 });
    }

    if (!user.otpExpires || user.otpExpires < Date.now()) {
      return NextResponse.json({ message: "OTP expired" }, { status: 400 });
    }

    // Mark as verified and active
    await db.updateUser(user.id, {
      is_active: true,
      otp: null,
      otpExpires: null,
    });

    // Create session
    const token = await signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json(
      { 
        message: "Verification successful!", 
        role: user.role,
        enabledWorkspaceKinds: user.enabledWorkspaceKinds 
      },
      { status: 200 }
    );

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 86400,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    logger.error("Verify OTP error", {
      requestId,
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}