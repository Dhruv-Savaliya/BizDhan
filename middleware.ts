import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAuthToken } from "@/lib/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth_token")?.value;

  const isUserPath = pathname.startsWith("/user");
  const isTrackerPath = pathname.startsWith("/tracker");

  if (isUserPath || isTrackerPath) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      await verifyAuthToken(token);
      return NextResponse.next();
    } catch (err) {
      console.error("Middleware JWT Error:", err);

      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("auth_token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/user/:path*", "/tracker/:path*"],
};