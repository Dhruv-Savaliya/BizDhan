import { NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getMongoDb } from "@/lib/database/clients";
import type { Workspace } from "@/types/workspace";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserAction();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { publicId, workspaceId: bodyWorkspaceId } = (await req.json()) as {
      publicId?: string;
      workspaceId?: string;
    };
    if (!publicId) {
      return NextResponse.json({ message: "publicId is required" }, { status: 400 });
    }

    const workspaceId =
      bodyWorkspaceId ??
      publicId.match(/\/workspaces\/([^/]+)\//)?.[1] ??
      publicId.match(/^workspaces\/([^/]+)\//)?.[1];

    if (!workspaceId) {
      return NextResponse.json(
        { message: "workspaceId is required" },
        { status: 400 }
      );
    }

    const db = await getMongoDb();
    const workspace = await db.collection<Workspace>("workspaces").findOne({
      id: workspaceId,
      ownerUserId: user.id,
    });
    if (!workspace) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const res = await cloudinary.uploader.destroy(publicId);
    return NextResponse.json({ result: res }, { status: 200 });
  } catch (err) {
    console.error("Delete file error:", err);
    return NextResponse.json({ message: "Delete failed" }, { status: 500 });
  }
}


