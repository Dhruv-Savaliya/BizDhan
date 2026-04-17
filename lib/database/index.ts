import { DatabaseAdapter } from '@/types/database';
import dns from "dns";

// Force Google DNS to avoid ISP-related resolution issues with MongoDB SRV records
if (typeof window === "undefined") {
  try {
    dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
    console.log("🟢 [Database] DNS servers set to Google/Cloudflare (8.8.8.8, 1.1.1.1)");
  } catch (e) {
    console.warn("🟡 [Database] Failed to set DNS servers:", e);
  }
}


let cachedDbAdapter: DatabaseAdapter | null = null;

export async function getDb(): Promise<DatabaseAdapter> {
  if (cachedDbAdapter) {
    return cachedDbAdapter;
  }

  cachedDbAdapter = (await import('./mongodb')).MongoDbAdapter;
  return cachedDbAdapter;
}