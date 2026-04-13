import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserAction } from "@/app/actions/auth";
import {
  calculateNextRun,
  RecurringTransaction,
  type RecurringFrequency,
} from "@/lib/models/RecurringTransaction";

const patchSchema = z
  .object({
    workspaceId: z.string().trim().optional(),
    amount: z.coerce.number().min(0).optional(),
    category: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    frequency: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().nullable().optional(),
    isActive: z.boolean().optional(),
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserAction();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid recurring transaction id" }, { status: 400 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const workspaceId = resolveWorkspaceId(user, parsed.data.workspaceId);
    if (!mongoose.Types.ObjectId.isValid(user.id) || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      return NextResponse.json(
        { message: "Invalid user or workspace identifier" },
        { status: 400 }
      );
    }

    await ensureMongooseConnection();

    const ownerQuery = {
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(user.id),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
    };

    const existing = await RecurringTransaction.findOne(ownerQuery);
    if (!existing) {
      return NextResponse.json({ message: "Recurring transaction not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.amount !== undefined) updates.amount = parsed.data.amount;
    if (parsed.data.category !== undefined) updates.category = parsed.data.category;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.frequency !== undefined) updates.frequency = parsed.data.frequency;
    if (parsed.data.startDate !== undefined) updates.startDate = parsed.data.startDate;
    if (parsed.data.endDate !== undefined) updates.endDate = parsed.data.endDate;
    if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "No updatable fields provided" }, { status: 400 });
    }

    if (parsed.data.frequency !== undefined || parsed.data.startDate !== undefined) {
      const startDateForCalc = parsed.data.startDate ?? existing.startDate;
      const frequencyForCalc = (parsed.data.frequency ??
        existing.frequency) as RecurringFrequency;
      updates.nextRunDate = calculateNextRun(startDateForCalc, frequencyForCalc);
    }

    const updated = await RecurringTransaction.findOneAndUpdate(
      ownerQuery,
      { $set: updates },
      { new: true }
    ).lean();

    return NextResponse.json({ item: updated }, { status: 200 });
  } catch (error) {
    console.error("Failed to update recurring transaction:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserAction();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid recurring transaction id" }, { status: 400 });
    }

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

    const updated = await RecurringTransaction.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(user.id),
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
      },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ message: "Recurring transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete recurring transaction:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
