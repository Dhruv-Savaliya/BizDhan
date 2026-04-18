import { NextResponse } from "next/server";
import { runAlertJobs } from "@/lib/cron/alerts";

/** Manual / legacy trigger; production schedule uses `/api/cron/daily`. */
export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await runAlertJobs();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Alert cron failed:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
