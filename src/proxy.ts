import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_COOKIE = "auth_token";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/verify-email"];

function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) return false;
  try {
    jwt.verify(token, JWT_SECRET) as JwtPayload;
    return true;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = isAuthenticated(request);
  const isPublicAuthPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (!authed && pathname.startsWith("/dashboard")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (authed && isPublicAuthPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login/:path*",
    "/signup/:path*",
    "/forgot-password/:path*",
    "/verify-email/:path*",
  ],
};