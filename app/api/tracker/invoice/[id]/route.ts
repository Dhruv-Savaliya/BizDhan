import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getMongoDb } from "@/lib/database/clients";
import { resolveActiveWorkspaceIdForUser } from "@/lib/workspace-for-user";
import type { InvoiceEntry } from "@/types/invoice";

const patchSchema = z
  .object({
    invoiceNumber: z.string().trim().min(1).max(100).optional(),
    partyName: z.string().trim().min(1).max(255).optional(),
    billType: z.enum(["payable", "receivable"]).optional(),
    amount: z.coerce.number().positive().optional(),
    status: z.enum(["draft", "unpaid", "partial", "paid", "overdue"]).optional(),
    notes: z.string().trim().max(500).optional(),
    date: z
      .string()
      .trim()
      .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid date")
      .optional(),
    dueDate: z
      .string()
      .trim()
      .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid due date")
      .optional(),
  })
  .strict();

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: { message } }, { status });
}

async function getWorkspaceId(user: NonNullable<Awaited<ReturnType<typeof getCurrentUserAction>>>) {
  return (await resolveActiveWorkspaceIdForUser(user)) ?? "default";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserAction();
    if (!user) return errorResponse(401, "Unauthorized");

    const { id } = await context.params;
    if (!id) return errorResponse(400, "Missing invoice id");

    const db = await getMongoDb();
    const existing = await db.collection<InvoiceEntry>("invoice_entries").findOne({ id });
    if (!existing) return errorResponse(404, "Invoice record not found");

    const workspaceId = await getWorkspaceId(user);
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
    const updateFields: Partial<InvoiceEntry> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.invoiceNumber !== undefined) updateFields.invoiceNumber = payload.invoiceNumber;
    if (payload.partyName !== undefined) updateFields.partyName = payload.partyName;
    if (payload.billType !== undefined) updateFields.billType = payload.billType;
    if (payload.amount !== undefined) updateFields.amount = payload.amount;
    if (payload.status !== undefined) updateFields.status = payload.status;
    if (payload.notes !== undefined) updateFields.notes = payload.notes || undefined;
    if (payload.date !== undefined) updateFields.issuedAt = new Date(payload.date).toISOString();
    if (payload.dueDate !== undefined) updateFields.dueAt = new Date(payload.dueDate).toISOString();

    if (Object.keys(updateFields).length === 1) {
      return errorResponse(400, "No updatable fields provided");
    }

    const result = await db
      .collection<InvoiceEntry>("invoice_entries")
      .findOneAndUpdate(
        { id, userId: user.id, workspaceId },
        { $set: updateFields },
        { returnDocument: "after" }
      );

    if (!result) return errorResponse(404, "Invoice record not found");

    return NextResponse.json({ item: result }, { status: 200 });
  } catch (error) {
    console.error("Failed to update invoice record:", error);
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
    if (!id) return errorResponse(400, "Missing invoice id");

    const db = await getMongoDb();
    const existing = await db.collection<InvoiceEntry>("invoice_entries").findOne({ id });
    if (!existing) return errorResponse(404, "Invoice record not found");

    const workspaceId = await getWorkspaceId(user);
    if (existing.userId !== user.id || existing.workspaceId !== workspaceId) {
      return errorResponse(403, "Forbidden");
    }

    const result = await db
      .collection<InvoiceEntry>("invoice_entries")
      .deleteOne({ id, userId: user.id, workspaceId });

    if (result.deletedCount === 0) return errorResponse(404, "Invoice record not found");

    return NextResponse.json({ success: true, deletedId: id }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete invoice record:", error);
    return errorResponse(500, "Internal server error");
  }
}
