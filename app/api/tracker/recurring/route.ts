import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserAction } from "@/app/actions/auth";
import {
  calculateNextRun,
  RecurringTransaction,
} from "@/lib/models/RecurringTransaction";

const createRecurringSchema = z
  .object({
    workspaceId: z.string().trim().optional(),
    type: z.enum(["income", "expense"]),
    amount: z.coerce.number().min(0),
    category: z.string().trim().min(1),
    description: z.string().trim().optional(),
    frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullable().optional(),
  })
  .strict();

async function ensureMongooseConnection() {
  if (mongoose.connection.readyState >= 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }
  await mongoose.connect(uri);
}

function resolveWorkspaceId(
  user: Awaited<ReturnType<typeof getCurrentUserAction>>,
  bodyWorkspaceId?: string
) {
  return user?.defaultWorkspaceId ?? bodyWorkspaceId ?? "default";
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserAction();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createRecurringSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const workspaceId = resolveWorkspaceId(user, parsed.data.workspaceId);
    const nextRunDate = calculateNextRun(parsed.data.startDate, parsed.data.frequency);

    if (!mongoose.Types.ObjectId.isValid(user.id) || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      return NextResponse.json(
        { message: "Invalid user or workspace identifier" },
        { status: 400 }
      );
    }

    await ensureMongooseConnection();

    const created = await RecurringTransaction.create({
      userId: new mongoose.Types.ObjectId(user.id),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      type: parsed.data.type,
      amount: parsed.data.amount,
      category: parsed.data.category,
      description: parsed.data.description ?? "",
      frequency: parsed.data.frequency,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate ?? null,
      nextRunDate,
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    console.error("Failed to create recurring transaction:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserAction();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const workspaceFromQuery = url.searchParams.get("workspaceId") ?? undefined;
    const workspaceId = resolveWorkspaceId(user, workspaceFromQuery);

    if (!mongoose.Types.ObjectId.isValid(user.id) || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      return NextResponse.json(
        { message: "Invalid user or workspace identifier" },
        { status: 400 }
      );
    }

    await ensureMongooseConnection();

    const items = await RecurringTransaction.find({
      userId: new mongoose.Types.ObjectId(user.id),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      isActive: true,
    })
      .sort({ nextRunDate: 1 })
      .lean();

    return NextResponse.json({ data: items }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch recurring transactions:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
