import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getMongoDb } from "@/lib/database/clients";
import type { ExpenseEntry } from "@/types/expense";
import { createExpenseEntry, normalizeExpenseInput } from "@/lib/expense";
import { suggestCategory } from "@/lib/ai/categorize";

const postBodySchema = z.object({
  amount: z.unknown(),
  category: z.string().optional(),
  description: z.string().optional(),
});

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
    .collection<ExpenseEntry>("expense_entries")
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
    const parsed = postBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    if (!body?.category || !String(body.category).trim()) {
      const amountNumber = Number(parsed.data.amount);
      const aiCategory = await suggestCategory(
        parsed.data.description?.trim() ?? "",
        Number.isFinite(amountNumber) ? amountNumber : 0,
        "expense"
      );
      body.category = aiCategory;
    }

    const normalized = normalizeExpenseInput(body ?? {});

    const db = await getMongoDb();
    const created = await createExpenseEntry({
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

