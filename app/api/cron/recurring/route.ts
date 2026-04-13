import { NextResponse } from "next/server";
import { processRecurringTransactions } from "@/lib/jobs/processRecurring";

export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await processRecurringTransactions();
    return NextResponse.json(
      { success: true, processedAt: new Date() },
      { status: 200 }
    );
  } catch (error) {
    console.error("Recurring cron failed:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
