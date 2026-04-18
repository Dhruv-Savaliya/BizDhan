import { NextResponse } from "next/server";
import { runRecurringJobs } from "@/lib/cron/recurring";

/** Manual / legacy trigger; production schedule uses `/api/cron/daily`. */
export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await runRecurringJobs();
    return NextResponse.json(
      { success: true, processedAt: new Date() },
      { status: 200 }
    );
  } catch (error) {
    console.error("Recurring cron failed:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
