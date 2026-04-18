import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserAction } from "@/app/actions/auth";
import { setActiveWorkspaceForKind } from "@/lib/workspace-for-user";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  kind: z.enum(["personal", "sme"]),
});

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? "unknown";
  try {
    const user = await getCurrentUserAction();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid body" }, { status: 400 });
    }

    const kinds = user.enabledWorkspaceKinds ?? [];
    if (!kinds.includes(parsed.data.kind)) {
      return NextResponse.json({ message: "Workspace not enabled for this account" }, { status: 403 });
    }

    const result = await setActiveWorkspaceForKind(user.id, parsed.data.kind);
    if (!result.ok) {
      return NextResponse.json({ message: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, workspaceId: result.workspaceId }, { status: 200 });
  } catch (err: unknown) {
    logger.error("active-workspace POST error", {
      requestId,
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
