import { redirect } from "next/navigation";
import { getCurrentUserAction } from "@/app/actions/auth";

export default async function TrackerRootPage() {
  const user = await getCurrentUserAction();

  if (!user) {
    redirect("/login");
  }

  const enabled = user.enabledWorkspaceKinds || [];
  
  if (enabled.includes("personal") && enabled.includes("sme")) {
    redirect("/tracker/income");
  } else if (enabled.includes("sme")) {
    redirect("/tracker/purchase");
  } else if (enabled.includes("personal")) {
    redirect("/tracker/income");
  } else {
    redirect("/tracker/income"); // Default fallback
  }
}
