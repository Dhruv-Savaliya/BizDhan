import { redirect } from "next/navigation";
import { getCurrentUserAction } from "@/app/actions/auth";

export default async function LegacyDashboardRedirectPage() {
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

  if (hasPersonal && hasSme) {
    redirect("/tracker/select-workspace");
  }

  if (hasSme && !hasPersonal) {
    redirect("/tracker/sme/dashboard");
  }

  redirect("/tracker/personal/dashboard");
}
