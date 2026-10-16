import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/database";
import { signAuthToken } from "@/lib/jwt";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? "unknown";
  let stage = "parse_request";

  try {
    const body = await request.json();
    const rawEmail = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const email = rawEmail.trim().toLowerCase();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Missing email or password", requestId },
        { status: 400 }
      );
    }

    stage = "database_lookup";
    const db = await getDb();
    const user = await db.findUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials", requestId },
        { status: 401 }
      );
    }

    stage = "password_verification";
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { message: "Invalid credentials", requestId },
        { status: 401 }
      );
    }

    if (user.is_active === false) {
      return NextResponse.json(
        {
          message: "Account not verified. Please verify your email.",
          requiresVerification: true,
          userId: user.id,
          email: user.email,
          requestId,
        },
        { status: 403 }
      );
    }

    stage = "jwt_signing";
    const token = await signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json(
      { message: "Login successful", role: user.role, requestId },
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
    const error = err instanceof Error ? err : new Error("Unknown error");
    logger.error("Login request failed", {
      requestId,
      stage,
      errorName: error.name,
      error: error.message,
      stack: error.stack,
    });

    // Do not return internal database/configuration details to the browser.
    return NextResponse.json(
      {
        message: "Login service is temporarily unavailable. Please try again shortly.",
        requestId,
      },
      { status: 500 }
    );
  }
}
