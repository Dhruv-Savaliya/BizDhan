import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAuthToken } from "@/lib/jwt";
import { logger } from "@/lib/logger";

export async function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth_token")?.value;
  logger.info("Incoming request", {
    method: request.method,
    pathname,
    requestId,
    timestamp: Date.now(),
  });

  const isUserPath = pathname.startsWith("/user");
  const isTrackerPath = pathname.startsWith("/tracker");
  const isAdminPath = pathname.startsWith("/admin");
  const isModeratorPath = pathname.startsWith("/moderator");

  if (isUserPath || isTrackerPath || isAdminPath || isModeratorPath) {
    if (!token) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.headers.set("x-request-id", requestId);
      return response;
    }

    try {
      const session = await verifyAuthToken(token);

      if (isAdminPath && session.role !== "admin") {
        const response = NextResponse.json(
          { error: "Forbidden", message: "Admin access required" },
          { status: 403 }
        );
        response.headers.set("x-request-id", requestId);
        return response;
      }

      if (
        isModeratorPath &&
        session.role !== "admin" &&
        session.role !== "moderator"
      ) {
        const response = NextResponse.json(
          { error: "Forbidden", message: "Admin or moderator access required" },
          { status: 403 }
        );
        response.headers.set("x-request-id", requestId);
        return response;
      }

      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      response.headers.set("x-request-id", requestId);
      return response;
    } catch (err) {
      logger.error("Middleware JWT Error", {
        requestId,
        error: err instanceof Error ? err.message : "Unknown error",
        stack: err instanceof Error ? err.stack : undefined,
      });

      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("auth_token");
      response.headers.set("x-request-id", requestId);
      return response;
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/user/:path*",
    "/tracker/:path*",
    "/admin/:path*",
    "/moderator/:path*",
  ],
};