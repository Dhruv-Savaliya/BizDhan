export type WorkspaceKind = "personal" | "sme";

export type SignupMode = WorkspaceKind | "both";

export interface Workspace {
  id: string;
  kind: WorkspaceKind;
  ownerUserId: string;
  name: string;
  created_at: string;
  updated_at: string;
}

