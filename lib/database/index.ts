import { DatabaseAdapter } from '@/types/database';

let cachedDbAdapter: DatabaseAdapter | null = null;

export async function getDb(): Promise<DatabaseAdapter> {
  if (cachedDbAdapter) {
    return cachedDbAdapter;
  }

  cachedDbAdapter = (await import('./mongodb')).MongoDbAdapter;
  return cachedDbAdapter;
}