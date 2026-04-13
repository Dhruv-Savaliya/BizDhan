import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAuthToken } from "@/lib/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth_token")?.value;

  const isUserPath = pathname.startsWith("/user");
  const isTrackerPath = pathname.startsWith("/tracker");
  const isAdminPath = pathname.startsWith("/admin");
  const isModeratorPath = pathname.startsWith("/moderator");

  if (isUserPath || isTrackerPath || isAdminPath || isModeratorPath) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      const session = await verifyAuthToken(token);

      if (isAdminPath && session.role !== "admin") {
        return NextResponse.json(
          { error: "Forbidden", message: "Admin access required" },
          { status: 403 }
        );
      }

      if (
        isModeratorPath &&
        session.role !== "admin" &&
        session.role !== "moderator"
      ) {
        return NextResponse.json(
          { error: "Forbidden", message: "Admin or moderator access required" },
          { status: 403 }
        );
      }

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
  matcher: [
    "/user/:path*",
    "/tracker/:path*",
    "/admin/:path*",
    "/moderator/:path*",
  ],
};