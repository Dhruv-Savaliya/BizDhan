"use server";

import { cookies } from "next/headers";
import { getDb } from "@/lib/database";
import { verifyAuthToken } from "@/lib/jwt";

export async function getCurrentUserAction() {
  const db = await getDb();
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = await verifyAuthToken(token);
    const userId = payload.userId as string;

    if (!userId) return null;

    const user = await db.findUserById(userId);

    if (!user) {
      cookieStore.delete("auth_token");
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, otp, otpExpires, ...rest } = user;
    return {
      ...rest,
      name: user.fullName,
    };
  } catch (error) {
    console.error("Authentication error in server action:", error);
    cookieStore.delete("auth_token");
    return null;
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
}
