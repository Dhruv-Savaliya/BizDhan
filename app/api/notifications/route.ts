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
  queryWorkspaceId?: string
) {
  return user?.defaultWorkspaceId ?? queryWorkspaceId ?? "default";
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserAction();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";
    const limitRaw = url.searchParams.get("limit");
    const cursor = url.searchParams.get("cursor");
    const workspaceFromQuery = url.searchParams.get("workspaceId") ?? undefined;
    const workspaceId = resolveWorkspaceId(user, workspaceFromQuery);

    const limit = limitRaw === null ? 20 : Number(limitRaw);
    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
      return NextResponse.json({ message: "Invalid limit. Use an integer between 1 and 100." }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(user.id) || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      return NextResponse.json(
        { message: "Invalid user or workspace identifier" },
        { status: 400 }
      );
    }

    if (cursor && !mongoose.Types.ObjectId.isValid(cursor)) {
      return NextResponse.json({ message: "Invalid cursor" }, { status: 400 });
    }

    await ensureMongooseConnection();

    const query: {
      userId: mongoose.Types.ObjectId;
      workspaceId: mongoose.Types.ObjectId;
      isRead?: boolean;
      _id?: { $lt: mongoose.Types.ObjectId };
    } = {
      userId: new mongoose.Types.ObjectId(user.id),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
    };

    if (unreadOnly) {
      query.isRead = false;
    }

    if (cursor) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const items = await Notification.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = items.length > limit;
    const notifications = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? notifications[notifications.length - 1]?._id?.toString() ?? null : null;

    const unreadCount = await Notification.countDocuments({
      userId: new mongoose.Types.ObjectId(user.id),
      isRead: false,
    });

    return NextResponse.json(
      { notifications, unreadCount, nextCursor },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
