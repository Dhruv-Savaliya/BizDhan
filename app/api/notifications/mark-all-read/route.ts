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

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserAction();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const workspaceFromQuery = url.searchParams.get("workspaceId") ?? undefined;
    const workspaceId = user.defaultWorkspaceId ?? workspaceFromQuery ?? "default";

    if (!mongoose.Types.ObjectId.isValid(user.id) || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      return NextResponse.json(
        { message: "Invalid user or workspace identifier" },
        { status: 400 }
      );
    }

    await ensureMongooseConnection();

    await Notification.updateMany(
      {
        userId: new mongoose.Types.ObjectId(user.id),
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        isRead: false,
      },
      { $set: { isRead: true } }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to mark notifications as read:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
