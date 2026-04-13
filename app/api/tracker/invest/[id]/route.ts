import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getMongoDb } from "@/lib/database/clients";
import type { InvestmentEntry } from "@/types/investment";

const patchSchema = z
  .object({
    amount: z.coerce.number().positive().optional(),
    investmentType: z
      .enum(["stocks", "mutual_fund", "crypto", "fd", "rd", "bond", "gold", "real_estate", "ppf", "nps", "other"])
      .optional(),
    returns: z.coerce.number().optional(),
    notes: z.string().trim().max(500).optional(),
    date: z
      .string()
      .trim()
      .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid date")
      .optional(),
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
    if (!id) return errorResponse(400, "Missing investment id");

    const db = await getMongoDb();
    const existing = await db.collection<InvestmentEntry>("investment_entries").findOne({ id });
    if (!existing) return errorResponse(404, "Investment record not found");

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
    const updateFields: Partial<InvestmentEntry> & { returns?: number } = {
      updated_at: new Date().toISOString(),
    };

    if (payload.amount !== undefined) updateFields.amount = payload.amount;
    if (payload.investmentType !== undefined) updateFields.type = payload.investmentType;
    if (payload.returns !== undefined) updateFields.returns = payload.returns;
    if (payload.notes !== undefined) updateFields.notes = payload.notes || undefined;
    if (payload.date !== undefined) updateFields.investedAt = new Date(payload.date).toISOString();

    if (Object.keys(updateFields).length === 1) {
      return errorResponse(400, "No updatable fields provided");
    }

    const result = await db
      .collection<InvestmentEntry>("investment_entries")
      .findOneAndUpdate(
        { id, userId: user.id, workspaceId },
        { $set: updateFields },
        { returnDocument: "after" }
      );

    if (!result) return errorResponse(404, "Investment record not found");

    return NextResponse.json({ item: result }, { status: 200 });
  } catch (error) {
    console.error("Failed to update investment record:", error);
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
    if (!id) return errorResponse(400, "Missing investment id");

    const db = await getMongoDb();
    const existing = await db.collection<InvestmentEntry>("investment_entries").findOne({ id });
    if (!existing) return errorResponse(404, "Investment record not found");

    const workspaceId = getWorkspaceId(user);
    if (existing.userId !== user.id || existing.workspaceId !== workspaceId) {
      return errorResponse(403, "Forbidden");
    }

    const result = await db
      .collection<InvestmentEntry>("investment_entries")
      .deleteOne({ id, userId: user.id, workspaceId });

    if (result.deletedCount === 0) return errorResponse(404, "Investment record not found");

    return NextResponse.json({ success: true, deletedId: id }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete investment record:", error);
    return errorResponse(500, "Internal server error");
  }
}
