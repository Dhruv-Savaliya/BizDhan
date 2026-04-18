export type IsolatedCronJobResult = {
  id: string;
  ok: boolean;
  durationMs: number;
  error?: string;
};

/**
 * Runs a single cron job with isolated try/catch so failures do not abort sibling jobs.
 * Add new daily jobs by calling this helper from the daily route with a new id + fn.
 */
export async function runIsolatedCronJob(
  id: string,
  startMessage: string,
  fn: () => Promise<void>
): Promise<IsolatedCronJobResult> {
  console.log(`[cron:daily] ${startMessage}`);
  const started = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - started;
    console.log(`[cron:daily] ${id} completed in ${durationMs}ms`);
    return { id, ok: true, durationMs };
  } catch (error) {
    const durationMs = Date.now() - started;
    console.error(`[cron:daily] ${id} failed:`, error);
    return {
      id,
      ok: false,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
