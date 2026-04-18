import { redirect } from "next/navigation";
import { getCurrentUserAction } from "@/app/actions/auth";
import { SelectWorkspacePanel } from "./select-workspace-panel";

export default async function SelectWorkspacePage() {
  const user = await getCurrentUserAction();
  if (!user) {
    redirect("/login");
  }

  const kinds = user.enabledWorkspaceKinds ?? [];
  if (!kinds.length) {
    redirect("/tracker/no-workspace");
  }

  const hasPersonal = kinds.includes("personal");
  const hasSme = kinds.includes("sme");

  if (!hasPersonal || !hasSme) {
    redirect(hasSme ? "/tracker/sme/dashboard" : "/tracker/personal/dashboard");
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center py-8">
      <SelectWorkspacePanel />
    </div>
  );
}
