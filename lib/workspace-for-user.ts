import { cookies } from "next/headers";
import { getMongoDb } from "@/lib/database/clients";
import type { Workspace, WorkspaceKind } from "@/types/workspace";

export const ACTIVE_WORKSPACE_COOKIE = "active-workspace";

export async function getWorkspaceIdsForOwner(ownerUserId: string): Promise<{
  personalWorkspaceId?: string;
  smeWorkspaceId?: string;
}> {
  const mongo = await getMongoDb();
  const rows = await mongo.collection<Workspace>("workspaces").find({ ownerUserId }).toArray();
  const personal = rows.find((w) => w.kind === "personal");
  const sme = rows.find((w) => w.kind === "sme");
  return {
    personalWorkspaceId: personal?.id,
    smeWorkspaceId: sme?.id,
  };
}

/** Cookie-first active workspace id for UI (sidebar); avoids extra DB round-trip when ids are known. */
export function resolveActiveWorkspaceIdFromCookie(params: {
  cookieKind: string | undefined;
  enabledWorkspaceKinds: string[];
  personalWorkspaceId?: string;
  smeWorkspaceId?: string;
  fallbackWorkspaceId?: string;
}): string | undefined {
  const kinds = params.enabledWorkspaceKinds;
  const raw = params.cookieKind;
  if (raw === "personal" && kinds.includes("personal") && params.personalWorkspaceId) {
    return params.personalWorkspaceId;
  }
  if (raw === "sme" && kinds.includes("sme") && params.smeWorkspaceId) {
    return params.smeWorkspaceId;
  }
  return params.fallbackWorkspaceId;
}

/** Resolves workspace id for API routes: cookie kind → workspace id, else user's defaultWorkspaceId. */
export async function resolveActiveWorkspaceIdForUser(user: {
  id: string;
  enabledWorkspaceKinds?: WorkspaceKind[];
  defaultWorkspaceId?: string;
}): Promise<string | undefined> {
  const cookieStore = await cookies();
  const cookieKind = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const ids = await getWorkspaceIdsForOwner(user.id);
  return resolveActiveWorkspaceIdFromCookie({
    cookieKind,
    enabledWorkspaceKinds: user.enabledWorkspaceKinds ?? [],
    personalWorkspaceId: ids.personalWorkspaceId,
    smeWorkspaceId: ids.smeWorkspaceId,
    fallbackWorkspaceId: user.defaultWorkspaceId,
  });
}

export async function setActiveWorkspaceForKind(userId: string, kind: WorkspaceKind): Promise<
  { ok: true; workspaceId: string } | { ok: false; error: string }
> {
  const mongo = await getMongoDb();
  const ws = await mongo.collection<Workspace>("workspaces").findOne({ ownerUserId: userId, kind });
  if (!ws) {
    return { ok: false, error: "Workspace not found" };
  }
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, kind, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  return { ok: true, workspaceId: ws.id };
}
