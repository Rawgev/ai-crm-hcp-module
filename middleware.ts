import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/health",
  "/health",
  "/icon.svg",
  "/favicon.ico",
];

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-replace-in-production-min-32-chars";
const secret = new TextEncoder().encode(JWT_SECRET);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow public paths directly
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"))) {
    // If user is already logged in and visits /login or /register, redirect to dashboard
    if (pathname === "/login" || pathname === "/register") {
      const token = req.cookies.get("token")?.value;
      if (token) {
        try {
          await jwtVerify(token, secret);
          return NextResponse.redirect(new URL("/", req.url));
        } catch {
          // Token invalid, proceed to login page
        }
      }
    }
    return NextResponse.next();
  }

  // 2. Extract token from cookie or Authorization header
  let token = req.cookies.get("token")?.value;
  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  // 3. If token is missing, redirect or return 401
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 4. Verify token
  try {
    const { payload } = await jwtVerify(token, secret);

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", (payload.id as string) || "");
    requestHeaders.set("x-user-email", (payload.email as string) || "");
    requestHeaders.set("x-user-role", (payload.role as string) || "");
    requestHeaders.set("x-user-name", (payload.name as string) || "");

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (err) {
    // Invalid or expired token
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired session" },
        { status: 401 }
      );
    }
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete("token");
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - static files (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

