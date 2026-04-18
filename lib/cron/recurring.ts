import { processRecurringTransactions } from "@/lib/jobs/processRecurring";

/**
 * Daily cron entry point for recurring transaction processing.
 * Add scheduling-specific logic here if needed; core work lives in processRecurringTransactions.
 */
export async function runRecurringJobs(): Promise<void> {
  await processRecurringTransactions();
}
