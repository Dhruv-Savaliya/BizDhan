import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserAction } from "@/app/actions/auth";
import Budget from "@/lib/models/Budget";
import { getMongoDb } from "@/lib/database/clients";
import { resolveActiveWorkspaceIdForUser } from "@/lib/workspace-for-user";
import type { ExpenseEntry } from "@/types/expense";

const createBudgetSchema = z
  .object({
    workspaceId: z.string().trim().optional(),
    category: z.string().trim().min(1),
    monthlyLimit: z.coerce.number().min(1),
    alertAt: z.coerce.number().min(1).max(100).optional(),
  })
  .strict();

async function ensureMongooseConnection() {
  if (mongoose.connection.readyState >= 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }
  await mongoose.connect(uri);
}

async function resolveWorkspaceId(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUserAction>>>,
  bodyWorkspaceId?: string
) {
  const effective = await resolveActiveWorkspaceIdForUser(user);
  return effective ?? bodyWorkspaceId ?? "default";
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserAction();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const workspaceFromQuery = url.searchParams.get("workspaceId") ?? undefined;
    const workspaceId = await resolveWorkspaceId(user, workspaceFromQuery);

    if (!mongoose.Types.ObjectId.isValid(user.id) || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      return NextResponse.json(
        { message: "Invalid user or workspace identifier" },
        { status: 400 }
      );
    }

    await ensureMongooseConnection();

    const budgets = await Budget.find({
      userId: new mongoose.Types.ObjectId(user.id),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
    })
      .sort({ category: 1 })
      .lean();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    const db = await getMongoDb();
    const spending = await db
      .collection<ExpenseEntry>("expense_entries")
      .aggregate<{ _id: string; total: number }>([
        {
          $match: {
            userId: user.id,
            workspaceId,
            spentAt: { $gte: monthStart, $lt: nextMonthStart },
          },
        },
        {
          $group: {
            _id: "$category",
            total: { $sum: "$amount" },
          },
        },
      ])
      .toArray();

    const spendByCategory = new Map(
      spending.map((item) => [item._id.toLowerCase(), item.total])
    );

    const data = budgets.map((budget) => {
      const currentSpend = spendByCategory.get(String(budget.category).toLowerCase()) ?? 0;
      const spendingPercent =
        budget.monthlyLimit > 0 ? Number(((currentSpend / budget.monthlyLimit) * 100).toFixed(2)) : 0;

      return {
        ...budget,
        currentSpend,
        spendingPercent,
      };
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch budgets:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserAction();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createBudgetSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const workspaceId = await resolveWorkspaceId(user, parsed.data.workspaceId);
    if (!mongoose.Types.ObjectId.isValid(user.id) || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      return NextResponse.json(
        { message: "Invalid user or workspace identifier" },
        { status: 400 }
      );
    }

    await ensureMongooseConnection();

    const existing = await Budget.findOne({
      userId: new mongoose.Types.ObjectId(user.id),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      category: parsed.data.category,
    }).lean();

    if (existing) {
      return NextResponse.json(
        { message: "Budget for this category already exists" },
        { status: 409 }
      );
    }

    const created = await Budget.create({
      userId: new mongoose.Types.ObjectId(user.id),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      category: parsed.data.category,
      monthlyLimit: parsed.data.monthlyLimit,
      alertAt: parsed.data.alertAt ?? 80,
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    console.error("Failed to create budget:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
