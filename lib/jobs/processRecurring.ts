import mongoose from "mongoose";
import {
  calculateNextRun,
  RecurringTransaction,
} from "@/lib/models/RecurringTransaction";
import { suggestCategory } from "@/lib/ai/categorize";
import { getMongoDb } from "@/lib/database/clients";

async function ensureMongooseConnection() {
  if (mongoose.connection.readyState >= 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }
  await mongoose.connect(uri);
}

export async function processRecurringTransactions() {
  await ensureMongooseConnection();
  const db = await getMongoDb();

  const dueRecords = await RecurringTransaction.find({
    isActive: true,
    nextRunDate: { $lte: new Date() },
  });

  let processedCount = 0;
  let errorCount = 0;

  for (const record of dueRecords) {
    try {
      const targetCollection =
        record.type === "income" ? "income_entries" : "expense_entries";
      const category =
        record.autoCategory === true
          ? await suggestCategory(record.description ?? "", record.amount, record.type)
          : record.category;

      await db.collection(targetCollection).insertOne({
        userId: record.userId.toString(),
        workspaceId: record.workspaceId.toString(),
        amount: record.amount,
        category,
        description: record.description,
        date: record.nextRunDate,
        source: "recurring",
        recurringId: record._id,
        createdAt: new Date(),
      });

      const nextRunDate = calculateNextRun(record.nextRunDate, record.frequency);
      const updatePayload: {
        lastRunDate: Date;
        nextRunDate: Date;
        isActive?: boolean;
      } = {
        lastRunDate: record.nextRunDate,
        nextRunDate,
      };

      if (record.endDate && nextRunDate > record.endDate) {
        updatePayload.isActive = false;
      }

      await RecurringTransaction.updateOne(
        { _id: record._id },
        { $set: updatePayload }
      );

      processedCount += 1;
    } catch (error) {
      errorCount += 1;
      console.error(
        `Failed to process recurring transaction ${record._id.toString()}:`,
        error
      );
    }
  }

  console.log(
    `Recurring processing complete. Processed: ${processedCount}, Errors: ${errorCount}`
  );
}
