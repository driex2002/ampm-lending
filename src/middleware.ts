/**
 * Next.js Middleware — Route Protection
 *
 * Guards:
 * - /admin/* → ADMIN role only
 * - /borrower/* → BORROWER role only
 * - /change-password → any authenticated user (if mustChangePassword)
 * - Unauthenticated → redirect to /login
 * - Admin trying to access borrower routes → redirect to /admin/dashboard
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Use edge-safe config — no Node.js-only imports (no prisma/bcrypt/nodemailer)
const { auth } = NextAuth(authConfig);

export default auth(function middleware(req) {
  const { nextUrl, auth: session } = req as NextRequest & {
    auth: { user?: { role?: string; mustChangePassword?: boolean } } | null;
  };

  const isLoggedIn = !!session?.user;
  const role = session?.user?.role;
  const mustChangePassword = session?.user?.mustChangePassword;

  const path = nextUrl.pathname;

  // ---------------------------------------------------------------
  // Public routes: allow through
  // ---------------------------------------------------------------
  const publicPaths = ["/login", "/api/auth"];
  if (publicPaths.some((p) => path.startsWith(p))) {
    // If already logged in and hits /login, redirect to dashboard
    if (isLoggedIn && path === "/login") {
      if (mustChangePassword) {
        return NextResponse.redirect(new URL("/change-password", req.url));
      }
      if (role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }
      return NextResponse.redirect(new URL("/borrower/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // ---------------------------------------------------------------
  // All other routes require authentication
  // ---------------------------------------------------------------
  if (!isLoggedIn) {
    const callbackUrl = encodeURIComponent(path);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, req.url)
    );
  }

  // ---------------------------------------------------------------
  // Force password change — can only visit /change-password
  // ---------------------------------------------------------------
  if (mustChangePassword && path !== "/change-password" && !path.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/change-password", req.url));
  }

  // ---------------------------------------------------------------
  // Admin routes
  // ---------------------------------------------------------------
  if (path.startsWith("/admin")) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/borrower/dashboard", req.url));
    }
  }

  // ---------------------------------------------------------------
  // Borrower routes
  // ---------------------------------------------------------------
  if (path.startsWith("/borrower")) {
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
    if (role !== "BORROWER") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
