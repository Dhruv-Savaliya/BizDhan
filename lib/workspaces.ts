import { v4 as uuidv4 } from "uuid";
import type { Db } from "mongodb";
import type { SignupMode, Workspace, WorkspaceKind } from "@/types/workspace";

function toKinds(mode: SignupMode): WorkspaceKind[] {
  if (mode === "both") return ["personal", "sme"];
  return [mode];
}

function defaultName(kind: WorkspaceKind, fullName: string) {
  return kind === "personal" ? `${fullName}'s Personal` : `${fullName}'s SME`;
}

export async function createWorkspacesForSignup(params: {
  db: Db;
  userId: string;
  fullName: string;
  signupMode: SignupMode;
}) {
  const { db, userId, fullName, signupMode } = params;

  const nowIso = new Date().toISOString();
  const kinds = toKinds(signupMode);

  const workspaces: Workspace[] = kinds.map((kind) => ({
    id: uuidv4(),
    kind,
    ownerUserId: userId,
    name: defaultName(kind, fullName),
    created_at: nowIso,
    updated_at: nowIso,
  }));

  if (workspaces.length > 0) {
    await db.collection<Workspace>("workspaces").insertMany(workspaces);
  }

  return {
    workspaces,
    workspaceIds: workspaces.map((w) => w.id),
    defaultWorkspaceId: workspaces[0]?.id,
    enabledWorkspaceKinds: kinds,
  };
}

