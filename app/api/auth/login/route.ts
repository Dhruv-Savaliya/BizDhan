import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/database";
import { signAuthToken } from "@/lib/jwt";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? "unknown";

  try {
    const db = await getDb();
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Missing email or password" },
        { status: 400 }
      );
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (user.is_active === false) {
      return NextResponse.json(
        { 
          message: "Account not verified. Please verify your email.", 
          requiresVerification: true,
          userId: user.id,
          email: user.email 
        },
        { status: 403 }
      );
    }

    const token = await signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json(
      { message: "Login successful", role: user.role },
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