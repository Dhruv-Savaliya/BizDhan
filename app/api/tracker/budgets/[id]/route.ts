import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserAction } from "@/app/actions/auth";
import Budget from "@/lib/models/Budget";
import { resolveActiveWorkspaceIdForUser } from "@/lib/workspace-for-user";

const patchBudgetSchema = z
  .object({
    workspaceId: z.string().trim().optional(),
    monthlyLimit: z.coerce.number().min(1).optional(),
    alertAt: z.coerce.number().min(1).max(100).optional(),
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

async function resolveWorkspaceId(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUserAction>>>,
  bodyWorkspaceId?: string
) {
  const effective = await resolveActiveWorkspaceIdForUser(user);
  return effective ?? bodyWorkspaceId ?? "default";
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
      return NextResponse.json({ message: "Invalid budget id" }, { status: 400 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = patchBudgetSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const workspaceId = await resolveWorkspaceId(user, parsed.data.workspaceId);
    if (!mongoose.Types.ObjectId.isValid(user.id) || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      return NextResponse.json(
        { message: "Invalid user or workspace identifier" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.monthlyLimit !== undefined) updates.monthlyLimit = parsed.data.monthlyLimit;
    if (parsed.data.alertAt !== undefined) updates.alertAt = parsed.data.alertAt;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "No updatable fields provided" }, { status: 400 });
    }

    await ensureMongooseConnection();

    const updated = await Budget.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(user.id),
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
      },
      { $set: updates },
      { new: true }
    ).lean();

    if (!updated) return NextResponse.json({ message: "Budget not found" }, { status: 404 });
    return NextResponse.json({ item: updated }, { status: 200 });
  } catch (error) {
    console.error("Failed to update budget:", error);
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
      return NextResponse.json({ message: "Invalid budget id" }, { status: 400 });
    }

    const url = new URL(request.url);
    const workspaceFromQuery = url.searchParams.get("workspaceId") ?? undefined;
    const workspaceId = await resolveWorkspaceId(user, workspaceFromQuery);
    if (!mongoose.Types.ObjectId.isValid(user.id) || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      return NextResponse.json(
        { message: "Invalid user or workspace identifier" },
        { status: 400 }
      );
    }

    await ensureMongooseConnection();

    const deleted = await Budget.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(user.id),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
    }).lean();

    if (!deleted) return NextResponse.json({ message: "Budget not found" }, { status: 404 });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete budget:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
