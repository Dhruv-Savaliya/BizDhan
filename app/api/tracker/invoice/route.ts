import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getMongoDb } from "@/lib/database/clients";
import { resolveActiveWorkspaceIdForUser } from "@/lib/workspace-for-user";
import type { InvoiceEntry } from "@/types/invoice";
import {
  createInvoiceEntry,
  normalizeInvoiceInput,
} from "@/lib/invoice";
import { generateInvoicePdfBuffer } from "@/lib/invoice-pdf-server";
import { sendInvoiceEmail } from "@/lib/email";
import { consumeStockForItem, getAvailableStockForItem } from "@/lib/purchase";

export async function DELETE(request: Request) {
  const user = await getCurrentUserAction();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  const workspaceId = (await resolveActiveWorkspaceIdForUser(user)) ?? "default";
  const db = await getMongoDb();
  const result = await db.collection("invoice_entries").deleteOne({
    id,
    userId: user.id,
    workspaceId,
  });

  if (result.deletedCount === 0) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

export async function GET(request: Request) {
  const user = await getCurrentUserAction();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw === null ? 20 : Number(limitRaw);
  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    return NextResponse.json({ message: "Invalid limit. Use an integer between 1 and 100." }, { status: 400 });
  }
  const cursor = url.searchParams.get("cursor");

  const workspaceId = (await resolveActiveWorkspaceIdForUser(user)) ?? "default";

  const db = await getMongoDb();
  const query: {
    userId: string;
    workspaceId: string;
    _id?: { $lt: ObjectId };
  } = {
    userId: user.id,
    workspaceId,
  };

  if (cursor) {
    if (!ObjectId.isValid(cursor)) {
      return NextResponse.json({ message: "Invalid cursor" }, { status: 400 });
    }
    query._id = { $lt: new ObjectId(cursor) };
  }

  const records = await db
    .collection<InvoiceEntry>("invoice_entries")
    .find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = records.length > limit;
  const data = hasMore ? records.slice(0, limit) : records;
  const nextCursor = hasMore ? (records[limit]?._id as ObjectId).toHexString() : null;

  return NextResponse.json({ data, nextCursor, hasMore }, { status: 200 });
}

export async function POST(request: Request) {
  const user = await getCurrentUserAction();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const workspaceId = (await resolveActiveWorkspaceIdForUser(user)) ?? "default";

  try {
    const normalized = normalizeInvoiceInput(body ?? {});

    const db = await getMongoDb();
    if (normalized.billType === "receivable") {
      if (!normalized.itemName || !normalized.quantity) {
        return NextResponse.json(
          { message: "Item name and quantity are required for receivable invoices." },
          { status: 400 }
        );
      }

      const stock = await getAvailableStockForItem({
        db,
        userId: user.id,
        workspaceId,
        itemName: normalized.itemName,
      });

      if (stock.total <= 0) {
        return NextResponse.json(
          { message: `No purchase stock found for "${normalized.itemName}". Add purchase first.` },
          { status: 400 }
        );
      }

      if (stock.total < normalized.quantity) {
        return NextResponse.json(
          {
            message: `Insufficient stock for "${normalized.itemName}". Available: ${stock.total}, required: ${normalized.quantity}.`,
          },
          { status: 400 }
        );
      }
    }

    const created = await createInvoiceEntry({
      db,
      userId: user.id,
      workspaceId,
      ...normalized,
    });

    if (
      created.billType === "receivable" &&
      created.itemName &&
      typeof created.quantity === "number" &&
      created.quantity > 0
    ) {
      await consumeStockForItem({
        db,
        userId: user.id,
        workspaceId,
        itemName: created.itemName,
        quantity: created.quantity,
      });
    }

    let emailSent = false;
    if (created.billType === "receivable" && created.clientEmail) {
      try {
        const pdfBuffer = await generateInvoicePdfBuffer(created);
        await sendInvoiceEmail({
          to: created.clientEmail,
          invoice: created,
          pdfBuffer,
        });
        emailSent = true;
      } catch (mailError) {
        console.error(
          "Invoice created but failed to send email:",
          mailError instanceof Error ? mailError.message : mailError
        );
      }
    }

    return NextResponse.json({ item: created, emailSent }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Invalid input";
    return NextResponse.json({ message }, { status: 400 });
  }
}
