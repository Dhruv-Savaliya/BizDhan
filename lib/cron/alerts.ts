import { checkBudgetAlerts } from "@/lib/jobs/checkAlerts";

/**
 * Daily cron entry point for budget / alert checks.
 * Add scheduling-specific logic here if needed; core work lives in checkBudgetAlerts.
 */
export async function runAlertJobs(): Promise<void> {
  await checkBudgetAlerts();
}
