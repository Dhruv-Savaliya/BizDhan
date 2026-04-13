import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getMongoDb } from "@/lib/database/clients";
import type { IncomeEntry } from "@/types/income";
import { createIncomeEntry, normalizeIncomeInput } from "@/lib/income";

export async function GET(request: Request) {
  const user = await getCurrentUserAction();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw === null ? 20 : Number(limitRaw);
  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    return NextResponse.json({ message: "Invalid limit. Use an integer between 1 and 100." }, { status: 400 });
  }
  const cursor = url.searchParams.get("cursor");

  const workspaceId = user.defaultWorkspaceId ?? "default";

  const db = await getMongoDb();
  const query: {
    userId: string;
    workspaceId: string;
    _id?: { $lt: ObjectId };
  } = {
    userId: user.id,
    workspaceId,
  };

  if (cursor) {
    if (!ObjectId.isValid(cursor)) {
      return NextResponse.json({ message: "Invalid cursor" }, { status: 400 });
    }
    query._id = { $lt: new ObjectId(cursor) };
  }

  const records = await db
    .collection<IncomeEntry>("income_entries")
    .find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = records.length > limit;
  const data = hasMore ? records.slice(0, limit) : records;
  const nextCursor = hasMore ? (records[limit]?._id as ObjectId).toHexString() : null;

  return NextResponse.json({ data, nextCursor, hasMore }, { status: 200 });
}

export async function POST(request: Request) {
  const user = await getCurrentUserAction();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const workspaceId = user.defaultWorkspaceId ?? "default";

  try {
    const normalized = normalizeIncomeInput(body ?? {});

    const db = await getMongoDb();
    const created = await createIncomeEntry({
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

