import { NextResponse } from "next/server";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getMongoDb } from "@/lib/database/clients";
import {
  createInvoiceEntry,
  listInvoiceEntries,
  normalizeInvoiceInput,
} from "@/lib/invoice";

export async function GET(request: Request) {
  const user = await getCurrentUserAction();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");

  const workspaceId = user.defaultWorkspaceId ?? "default";

  const db = await getMongoDb();
  const items = await listInvoiceEntries({
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
    const normalized = normalizeInvoiceInput(body ?? {});

    const db = await getMongoDb();
    const created = await createInvoiceEntry({
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
