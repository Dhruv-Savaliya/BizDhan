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

    const { folder, workspaceId: bodyWorkspaceId } = (await req.json()) as {
      folder?: string;
      workspaceId?: string;
    };
    if (!folder) {
      return NextResponse.json(
        { message: "folder is required" },
        { status: 400 }
      );
    }

    const workspaceId =
      bodyWorkspaceId ??
      folder.match(/\/workspaces\/([^/]+)\//)?.[1] ??
      folder.match(/^workspaces\/([^/]+)\//)?.[1];

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

    const resources = await cloudinary.api.resources({
      type: "upload",
      prefix: folder + "/",
      max_results: 500,
    });

    if (resources.resources.length) {
      const publicIds = resources.resources.map((r: { public_id: string }) => r.public_id);
      await cloudinary.api.delete_resources(publicIds);
    }

    const res = await cloudinary.api.delete_folder(folder);
    return NextResponse.json({ result: res }, { status: 200 });
  } catch (err) {
    console.error("Delete folder error:", err);
    return NextResponse.json(
      { message: "Delete folder failed" },
      { status: 500 }
    );
  }
}
