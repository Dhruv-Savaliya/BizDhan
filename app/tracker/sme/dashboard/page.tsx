import { redirect } from "next/navigation";
import { getCurrentUserAction } from "@/app/actions/auth";
import { TrackerDashboardPage } from "@/components/tracker/dashboard-page";

export default async function SmeDashboardPage() {
  const user = await getCurrentUserAction();
  if (!user) {
    redirect("/login");
  }
  const kinds = user.enabledWorkspaceKinds ?? [];
  if (!kinds.length) {
    redirect("/tracker/no-workspace");
  }
  if (!kinds.includes("sme")) {
    redirect("/tracker/personal/dashboard");
  }
  return (
    <TrackerDashboardPage
      workspaceSubtitle="SME (business) workspace"
      workspaceKind="sme"
    />
  );
}
