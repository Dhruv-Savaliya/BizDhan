import { NextResponse } from "next/server";
import { getCurrentUserAction } from "@/app/actions/auth";
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

