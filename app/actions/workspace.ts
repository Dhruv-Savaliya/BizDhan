"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAction } from "@/app/actions/auth";
import { setActiveWorkspaceForKind } from "@/lib/workspace-for-user";
import type { WorkspaceKind } from "@/types/workspace";

export async function setActiveWorkspaceKindAction(kind: WorkspaceKind): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const user = await getCurrentUserAction();
  if (!user) {
    return { ok: false, error: "Unauthorized" };
  }
  const kinds = user.enabledWorkspaceKinds ?? [];
  if (!kinds.includes(kind)) {
    return { ok: false, error: "Workspace not enabled" };
  }
  const result = await setActiveWorkspaceForKind(user.id, kind);
  if (!result.ok) {
    return result;
  }
  revalidatePath("/tracker");
  return { ok: true };
}
