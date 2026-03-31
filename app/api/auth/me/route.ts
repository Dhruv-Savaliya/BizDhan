import { NextResponse } from "next/server";
import { getCurrentUserAction } from "@/app/actions/auth";

export async function GET() {
  const user = await getCurrentUserAction();

  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({ user }, { status: 200 });
}

