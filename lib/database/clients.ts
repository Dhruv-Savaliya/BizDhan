import type { Db } from "mongodb";
import { ensureIndexes } from "@/lib/db/indexes";

let cachedMongoDb: Db | null = null;

export async function getMongoDb() {
  if (cachedMongoDb) {
    return cachedMongoDb;
  }
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in the environment");
  }
  const dbName = process.env.MONGODB_DB_NAME;
  if (!dbName) {
    throw new Error("MONGODB_DB_NAME is not defined in the environment");
  }

  const { MongoClient } = await import("mongodb");
  const client = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });
  await client.connect();
  const db = client.db(dbName);
  await ensureIndexes(db);
  cachedMongoDb = db;
  return db;
}
