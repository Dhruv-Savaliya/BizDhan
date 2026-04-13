import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getCurrentUserAction } from "@/app/actions/auth";
import Notification from "@/lib/models/Notification";

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
  request: Request
) {
  const workspaceFromQuery = new URL(request.url).searchParams.get("workspaceId") ?? undefined;
  return user?.defaultWorkspaceId ?? workspaceFromQuery ?? "default";
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
      return NextResponse.json({ message: "Invalid notification id" }, { status: 400 });
    }

    const workspaceId = resolveWorkspaceId(user, request);
    if (!mongoose.Types.ObjectId.isValid(user.id) || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      return NextResponse.json(
        { message: "Invalid user or workspace identifier" },
        { status: 400 }
      );
    }

    await ensureMongooseConnection();

    const updated = await Notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(user.id),
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
      },
      { $set: { isRead: true } },
      { new: true }
    ).lean();

    if (!updated) return NextResponse.json({ message: "Notification not found" }, { status: 404 });
    return NextResponse.json({ item: updated }, { status: 200 });
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
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
      return NextResponse.json({ message: "Invalid notification id" }, { status: 400 });
    }

    const workspaceId = resolveWorkspaceId(user, request);
    if (!mongoose.Types.ObjectId.isValid(user.id) || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      return NextResponse.json(
        { message: "Invalid user or workspace identifier" },
        { status: 400 }
      );
    }

    await ensureMongooseConnection();

    const deleted = await Notification.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(user.id),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
    }).lean();

    if (!deleted) return NextResponse.json({ message: "Notification not found" }, { status: 404 });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete notification:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
