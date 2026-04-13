import mongoose from "mongoose";
import type { Db } from "mongodb";
import Budget from "@/lib/models/Budget";
import Notification from "@/lib/models/Notification";
import { getMongoDb } from "@/lib/database/clients";

type ExpenseAggregateRow = { _id: null; total: number };
type InvoiceEntry = {
  id: string;
  userId: string;
  workspaceId: string;
  dueAt?: string;
  status: "draft" | "unpaid" | "partial" | "paid" | "overdue";
};

async function ensureMongooseConnection() {
  if (mongoose.connection.readyState >= 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }
  await mongoose.connect(uri);
}

async function sendAlertEmail(params: {
  userId: string;
  workspaceId: string;
  type: "budget_exceeded" | "budget_warning";
  title: string;
  message: string;
}) {
  // Placeholder queue hook for async email delivery integration.
  console.log("Queued alert email:", params);
}

function getMonthRange() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { monthStart, monthEnd };
}

function getDayRange() {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { dayStart, dayEnd };
}

export async function checkBudgetAlerts() {
  await ensureMongooseConnection();
  const db = await getMongoDb();
  const { monthStart, monthEnd } = getMonthRange();

  const budgets = await Budget.find({});
  let createdNotifications = 0;
  let processedBudgets = 0;
  let errors = 0;

  for (const budget of budgets) {
    try {
      const spent = await db
        .collection("expense_entries")
        .aggregate<ExpenseAggregateRow>([
          {
            $addFields: {
              effectiveDate: {
                $ifNull: [
                  "$date",
                  {
                    $cond: [
                      { $ifNull: ["$spentAt", false] },
                      { $toDate: "$spentAt" },
                      null,
                    ],
                  },
                ],
              },
            },
          },
          {
            $match: {
              workspaceId: budget.workspaceId.toString(),
              category: budget.category,
              effectiveDate: { $gte: monthStart, $lte: monthEnd },
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray();

      const totalSpent = spent[0]?.total || 0;
      const percent = (totalSpent / budget.monthlyLimit) * 100;
      const budgetId = budget._id.toString();

      if (percent >= 100) {
        const existingExceeded = await Notification.findOne({
          userId: budget.userId,
          workspaceId: budget.workspaceId,
          type: "budget_exceeded",
          createdAt: { $gte: monthStart, $lte: monthEnd },
          "metadata.budgetId": budgetId,
        }).lean();

        if (!existingExceeded) {
          const title = "Budget exceeded";
          const message = `Your ${budget.category} budget of ₹${budget.monthlyLimit} has been exceeded. Spent: ₹${totalSpent}`;
          await Notification.create({
            userId: budget.userId,
            workspaceId: budget.workspaceId,
            type: "budget_exceeded",
            title,
            message,
            metadata: { budgetId, category: budget.category, totalSpent, monthlyLimit: budget.monthlyLimit },
          });
          await sendAlertEmail({
            userId: budget.userId.toString(),
            workspaceId: budget.workspaceId.toString(),
            type: "budget_exceeded",
            title,
            message,
          });
          createdNotifications += 1;
        }
      } else if (percent >= budget.alertAt) {
        const existingWarning = await Notification.findOne({
          userId: budget.userId,
          workspaceId: budget.workspaceId,
          type: "budget_warning",
          createdAt: { $gte: monthStart, $lte: monthEnd },
          "metadata.budgetId": budgetId,
        }).lean();

        if (!existingWarning) {
          await Notification.create({
            userId: budget.userId,
            workspaceId: budget.workspaceId,
            type: "budget_warning",
            title: "Budget warning",
            message: `You have used ${percent.toFixed(0)}% of your ${budget.category} budget.`,
            metadata: { budgetId, category: budget.category, totalSpent, monthlyLimit: budget.monthlyLimit },
          });
          createdNotifications += 1;
        }
      }

      processedBudgets += 1;
    } catch (error) {
      errors += 1;
      console.error(`Failed to process budget alert for budget ${budget._id.toString()}:`, error);
    }
  }

  await checkOverdueInvoices(db);
  console.log(
    `Budget alerts complete. Budgets processed: ${processedBudgets}, Notifications created: ${createdNotifications}, Errors: ${errors}`
  );
}

async function checkOverdueInvoices(db: Db) {
  const now = new Date();
  const { dayStart, dayEnd } = getDayRange();

  const overdueInvoices = await db.collection<InvoiceEntry>("invoice_entries").find({
    dueAt: { $lt: now.toISOString() },
    status: { $ne: "paid" },
  });

  for await (const invoice of overdueInvoices) {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(invoice.userId) ||
        !mongoose.Types.ObjectId.isValid(invoice.workspaceId)
      ) {
        continue;
      }

      const existing = await Notification.findOne({
        userId: new mongoose.Types.ObjectId(invoice.userId),
        workspaceId: new mongoose.Types.ObjectId(invoice.workspaceId),
        type: "invoice_overdue",
        createdAt: { $gte: dayStart, $lte: dayEnd },
        "metadata.invoiceId": invoice.id,
      }).lean();

      if (!existing) {
        await Notification.create({
          userId: new mongoose.Types.ObjectId(invoice.userId),
          workspaceId: new mongoose.Types.ObjectId(invoice.workspaceId),
          type: "invoice_overdue",
          title: "Invoice overdue",
          message: `Invoice ${invoice.id} is overdue and remains unpaid.`,
          metadata: { invoiceId: invoice.id, dueAt: invoice.dueAt, status: invoice.status },
        });
      }
    } catch (error) {
      console.error(`Failed to process overdue invoice alert for invoice ${invoice.id}:`, error);
    }
  }
}
