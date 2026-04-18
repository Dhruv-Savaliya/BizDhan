import { NextResponse } from "next/server";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getDb } from "@/lib/database";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? "unknown";
  try {
    const user = await getCurrentUserAction();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (err: unknown) {
    logger.error("Unhandled error", {
      requestId,
      error: err instanceof Error ? err.message : "Unknown error",
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? "unknown";
  try {
    const user = await getCurrentUserAction();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const updates = await request.json();
    const db = await getDb();
    
    // Whitelist fields that can be updated
    const allowedFields = [
      "fullName", "bio", "gender", "dateOfBirth", "city", "state", 
      "country", "addressLine1", "addressLine2", "postalCode", 
      "profilePic", "profilePicId"
    ];

    const filteredUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    await db.updateUser(user.id, filteredUpdates);
    
    const updatedUser = await db.findUserById(user.id);

    return NextResponse.json({ user: updatedUser }, { status: 200 });
  } catch (err: unknown) {
    logger.error("Profile update failed", {
      requestId,
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
