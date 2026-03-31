import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "@/lib/database";
import { getMongoDb } from "@/lib/database/clients";
import { User } from "@/types/user";
import { UserRole } from "@/types/roles";
import { getEnabledUserFields } from "@/types/user-schema";
import type { SignupMode } from "@/types/workspace";
import { createWorkspacesForSignup } from "@/lib/workspaces";
import { signAuthToken } from "@/lib/jwt";

export async function POST(request: Request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { fullName, email, password, role = "user", signupMode } = body as {
      fullName?: string;
      email?: string;
      password?: string;
      role?: string;
      signupMode?: SignupMode;
    };

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const extras: Partial<User> = {};
    for (const def of getEnabledUserFields()) {
      const val = body?.[def.name];
      if (val !== undefined) (extras as Record<string, unknown>)[def.name] = val;
    }

    const nowIso = new Date().toISOString();
    const normalizedSignupMode: SignupMode = signupMode ?? "personal";

    const newUser: Omit<User, "otp" | "otpExpires"> = {
      id: uuidv4(),
      fullName,
      email: email.toLowerCase(),
      passwordHash,
      role: role as UserRole,
      signupMode: normalizedSignupMode,
      created_at: nowIso,
      updated_at: nowIso,
      ...extras,
    };

    const createdUser = await db.createUser(newUser);
    if (!createdUser) {
      return NextResponse.json(
        { message: "Failed to create user" },
        { status: 500 }
      );
    }

    const mongo = await getMongoDb();
    const workspaceResult = await createWorkspacesForSignup({
      db: mongo,
      userId: createdUser.id,
      fullName: createdUser.fullName,
      signupMode: normalizedSignupMode,
    });

    await db.updateUser(createdUser.id, {
      enabledWorkspaceKinds: workspaceResult.enabledWorkspaceKinds,
      workspaceIds: workspaceResult.workspaceIds,
      defaultWorkspaceId: workspaceResult.defaultWorkspaceId,
    });

    const token = await signAuthToken({
      userId: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
    });

    const response = NextResponse.json(
      { message: "Signup successful", role: createdUser.role },
      { status: 201 }
    );
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 86400,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Signup error:", error);
    
    // Specifically handle MongoDB connection issues with a better message
    if (error.code === 'ECONNREFUSED' || error.message?.includes('mongodb')) {
      return NextResponse.json(
        { message: "Database connection failed. Please check your IP whitelist in MongoDB Atlas." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
