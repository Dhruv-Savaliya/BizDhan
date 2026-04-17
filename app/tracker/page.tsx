import { redirect } from "next/navigation";
import { getCurrentUserAction } from "@/app/actions/auth";

export default async function TrackerRootPage() {
  const user = await getCurrentUserAction();

  if (!user) {
    redirect("/login");
  }

  redirect("/tracker/dashboard");
}
