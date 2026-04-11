import { NextResponse } from "next/server";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getMongoDb } from "@/lib/database/clients";
import {
  createPurchaseEntry,
  listPurchaseEntries,
  normalizePurchaseInput,
} from "@/lib/purchase";

export async function DELETE(request: Request) {
  const user = await getCurrentUserAction();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  const workspaceId = user.defaultWorkspaceId ?? "default";
  const db = await getMongoDb();
  const result = await db.collection("purchase_entries").deleteOne({
    id,
    userId: user.id,
    workspaceId,
  });

  if (result.deletedCount === 0) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

export async function GET(request: Request) {
  const user = await getCurrentUserAction();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");

  const workspaceId = user.defaultWorkspaceId ?? "default";

  const db = await getMongoDb();
  const items = await listPurchaseEntries({
    db,
    userId: user.id,
    workspaceId,
    limit,
  });

  return NextResponse.json({ items }, { status: 200 });
}

export async function POST(request: Request) {
  const user = await getCurrentUserAction();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const workspaceId = user.defaultWorkspaceId ?? "default";

  try {
    const normalized = normalizePurchaseInput(body ?? {});

    const db = await getMongoDb();
    const created = await createPurchaseEntry({
      db,
      userId: user.id,
      workspaceId,
      ...normalized,
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Invalid input";
    return NextResponse.json({ message }, { status: 400 });
  }
}
