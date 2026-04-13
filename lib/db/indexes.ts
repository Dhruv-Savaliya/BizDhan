import type { Db, IndexSpecification } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var __bizdhanEnsureIndexesPromise: Promise<void> | undefined;
}

const TRACKER_COLLECTIONS = [
  "income_entries",
  "expense_entries",
  "investment_entries",
  "purchase_entries",
  "invoice_entries",
] as const;

const trackerIndexSpecs: [IndexSpecification, Record<string, unknown>][] = [
  [{ userId: 1, workspaceId: 1, createdAt: -1 }, { name: "user_workspace_createdAt_desc" }],
  [{ userId: 1, workspaceId: 1, category: 1 }, { name: "user_workspace_category" }],
  [{ workspaceId: 1, date: -1 }, { name: "workspace_date_desc" }],
];

export async function ensureIndexes(db?: Db) {
  if (!globalThis.__bizdhanEnsureIndexesPromise) {
    globalThis.__bizdhanEnsureIndexesPromise = (async () => {
      const activeDb =
        db ??
        (await (async () => {
          const { getMongoDb } = await import("@/lib/database/clients");
          return getMongoDb();
        })());
      for (const collectionName of TRACKER_COLLECTIONS) {
        const collection = activeDb.collection(collectionName);
        await collection.createIndexes(
          trackerIndexSpecs.map(([key, options]) => ({
            key,
            ...options,
          }))
        );
      }

      const users = activeDb.collection("users");
      await users.createIndexes([
        {
          key: { email: 1 },
          unique: true,
          name: "email_unique",
        },
        {
          key: { workspaceIds: 1 },
          name: "workspaceIds_idx",
        },
      ]);
    })().catch((error) => {
      globalThis.__bizdhanEnsureIndexesPromise = undefined;
      throw error;
    });
  }

  await globalThis.__bizdhanEnsureIndexesPromise;
}
