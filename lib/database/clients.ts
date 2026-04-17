import type { Db } from "mongodb";
import { ensureIndexes } from "@/lib/db/indexes";
import dns from "dns";

// Force Google DNS to avoid ISP-related resolution issues with MongoDB SRV records
if (typeof window === "undefined") {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
}

let cachedMongoDb: Db | null = null;

export async function getMongoDb() {
  if (cachedMongoDb) {
    return cachedMongoDb;
  }
  const { MongoClient } = await import("mongodb");
  const mongoUri = process.env.MONGODB_URI!;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in .env");
  }
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME);
  await ensureIndexes(db);
  cachedMongoDb = db;
  return db;
}