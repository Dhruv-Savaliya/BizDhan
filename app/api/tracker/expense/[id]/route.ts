import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getMongoDb } from "@/lib/database/clients";
import type { ExpenseEntry } from "@/types/expense";

const patchSchema = z
  .object({
    amount: z.coerce.number().positive().optional(),
    category: z
      .enum([
        "food",
        "rent",
        "utilities",
        "transport",
        "shopping",
        "health",
        "education",
        "entertainment",
        "travel",
        "subscriptions",
        "tax",
        "marketing",
        "store_expense",
        "other",
      ])
      .optional(),
    description: z.string().trim().max(500).optional(),
    date: z
      .string()
      .trim()
      .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid date")
      .optional(),
    vendor: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: { message } }, { status });
}

function getWorkspaceId(user: Awaited<ReturnType<typeof getCurrentUserAction>>) {
  return user?.defaultWorkspaceId ?? "default";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserAction();
    if (!user) return errorResponse(401, "Unauthorized");

    const { id } = await context.params;
    if (!id) return errorResponse(400, "Missing expense id");

    const db = await getMongoDb();
    const existing = await db.collection<ExpenseEntry>("expense_entries").findOne({ id });
    if (!existing) return errorResponse(404, "Expense record not found");

    const workspaceId = getWorkspaceId(user);
    if (existing.userId !== user.id || existing.workspaceId !== workspaceId) {
      return errorResponse(403, "Forbidden");
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return errorResponse(400, "Invalid JSON body");
    }

    const parsed = patchSchema.safeParse(rawBody);
    if (!parsed.success) {
      return errorResponse(400, parsed.error.issues[0]?.message ?? "Invalid request body");
    }

    const payload = parsed.data;
    const updateFields: Partial<ExpenseEntry> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.amount !== undefined) updateFields.amount = payload.amount;
    if (payload.category !== undefined) updateFields.category = payload.category;
    if (payload.description !== undefined) updateFields.notes = payload.description || undefined;
    if (payload.date !== undefined) updateFields.spentAt = new Date(payload.date).toISOString();
    if (payload.vendor !== undefined) updateFields.merchant = payload.vendor;

    if (Object.keys(updateFields).length === 1) {
      return errorResponse(400, "No updatable fields provided");
    }

    const result = await db
      .collection<ExpenseEntry>("expense_entries")
      .findOneAndUpdate(
        { id, userId: user.id, workspaceId },
        { $set: updateFields },
        { returnDocument: "after" }
      );

    if (!result) return errorResponse(404, "Expense record not found");

    return NextResponse.json({ item: result }, { status: 200 });
  } catch (error) {
    console.error("Failed to update expense record:", error);
    return errorResponse(500, "Internal server error");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserAction();
    if (!user) return errorResponse(401, "Unauthorized");

    const { id } = await context.params;
    if (!id) return errorResponse(400, "Missing expense id");

    const db = await getMongoDb();
    const existing = await db.collection<ExpenseEntry>("expense_entries").findOne({ id });
    if (!existing) return errorResponse(404, "Expense record not found");

    const workspaceId = getWorkspaceId(user);
    if (existing.userId !== user.id || existing.workspaceId !== workspaceId) {
      return errorResponse(403, "Forbidden");
    }

    const result = await db
      .collection<ExpenseEntry>("expense_entries")
      .deleteOne({ id, userId: user.id, workspaceId });

    if (result.deletedCount === 0) return errorResponse(404, "Expense record not found");

    return NextResponse.json({ success: true, deletedId: id }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete expense record:", error);
    return errorResponse(500, "Internal server error");
  }
}
