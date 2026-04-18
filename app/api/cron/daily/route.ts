import { NextResponse } from "next/server";
import { runAlertJobs } from "@/lib/cron/alerts";
import { runRecurringJobs } from "@/lib/cron/recurring";
import { runIsolatedCronJob } from "@/lib/cron/runner";

export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const completedAt = new Date().toISOString();

  const recurringResult = await runIsolatedCronJob(
    "recurring",
    "Running recurring jobs...",
    runRecurringJobs
  );

  const alertsResult = await runIsolatedCronJob(
    "alerts",
    "Running alert jobs...",
    runAlertJobs
  );

  const allOk = recurringResult.ok && alertsResult.ok;
  if (allOk) {
    console.log("[cron:daily] Cron completed successfully");
  } else {
    console.warn("[cron:daily] Cron completed with one or more job failures", {
      recurring: recurringResult.ok,
      alerts: alertsResult.ok,
    });
  }

  // Always 200 when the daily handler finished; per-job status is in `jobs` (avoids Vercel retry storms on partial failures).
  return NextResponse.json(
    {
      success: allOk,
      completedAt,
      jobs: {
        recurring: recurringResult,
        alerts: alertsResult,
      },
    },
    { status: 200 }
  );
}
