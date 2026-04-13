import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getMongoDb } from "@/lib/database/clients";
import { aggregateFinancials } from "@/lib/export/aggregateFinancials";
import { generateCSV } from "@/lib/export/generateCSV";
import { generatePDF } from "@/lib/export/generatePDF";
import type { Workspace } from "@/types/workspace";

const querySchema = z.object({
  workspaceId: z.string().min(1, "workspaceId is required"),
  from: z.string().datetime({ message: "from must be a valid ISO date" }),
  to: z.string().datetime({ message: "to must be a valid ISO date" }),
  format: z.enum(["csv", "pdf"]),
});

async function workspaceGuard(request: Request, workspaceId: string, action: "read") {
  const user = await getCurrentUserAction();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const hasMembership = Boolean(
    user.workspaceIds?.includes(workspaceId) || user.defaultWorkspaceId === workspaceId
  );

  if (!hasMembership) {
    const db = await getMongoDb();
    const workspace = await db
      .collection<Workspace>("workspaces")
      .findOne({ id: workspaceId, ownerUserId: user.id });
    if (!workspace) {
      return NextResponse.json(
        { message: `Forbidden: no ${action} access to workspace` },
        { status: 403 }
      );
    }
  }

  // request is part of the expected guard signature
  void request;
  return null;
}

export async function GET(request: Request) {
  const session = await getCurrentUserAction();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const parseResult = querySchema.safeParse({
    workspaceId: url.searchParams.get("workspaceId"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    format: url.searchParams.get("format"),
  });

  if (!parseResult.success) {
    const issues = parseResult.error.issues.map((issue) => issue.message).join("; ");
    return NextResponse.json(
      { message: `Invalid query params: ${issues}` },
      { status: 400 }
    );
  }

  const params = parseResult.data;
  const fromDate = new Date(params.from);
  const toDate = new Date(params.to);
  toDate.setHours(23, 59, 59, 999);

  if (!(fromDate.getTime() < toDate.getTime())) {
    return NextResponse.json(
      { message: "Invalid date range: from must be before to" },
      { status: 400 }
    );
  }

  const rangeMs = toDate.getTime() - fromDate.getTime();
  const maxRangeMs = 366 * 24 * 60 * 60 * 1000;
  if (rangeMs > maxRangeMs) {
    return NextResponse.json(
      { message: "Invalid date range: range cannot exceed 366 days" },
      { status: 400 }
    );
  }

  const guardResponse = await workspaceGuard(request, params.workspaceId, "read");
  if (guardResponse) return guardResponse;

  const data = await aggregateFinancials(
    session.id,
    params.workspaceId,
    fromDate,
    toDate
  );

  if (params.format === "csv") {
    const csv = generateCSV(data);
    const csvWithBom = csv.startsWith("\uFEFF") ? csv : `\uFEFF${csv}`;
    return new NextResponse(csvWithBom, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bizdhan-${params.from}-to-${params.to}.csv"`,
      },
    });
  }

  const pdfBuffer = await generatePDF(data);
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bizdhan-report-${params.from}-to-${params.to}.pdf"`,
    },
  });
}
