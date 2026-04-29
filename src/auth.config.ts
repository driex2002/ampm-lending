/**
 * Edge-compatible auth config — used by Next.js middleware.
 * IMPORTANT: No Node.js-only imports (no prisma, bcrypt, nodemailer, etc.)
 * Middleware runs in the Edge Runtime which only supports Web APIs.
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  // Providers are added in auth.ts (they use Node.js APIs)
  providers: [],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On initial sign-in, user fields are passed from authorize() or OAuth
      if (user) {
        const u = user as unknown as Record<string, unknown>;
        if (u.id) token.id = u.id as string;
        if (u.role) token.role = u.role as string;
        if (u.mustChangePassword !== undefined)
          token.mustChangePassword = u.mustChangePassword as boolean;
        if (u.isActive !== undefined) token.isActive = u.isActive as boolean;
        if (u.firstName) token.firstName = u.firstName as string;
        if (u.lastName) token.lastName = u.lastName as string;
        token.nickname = (u.nickname as string | null) ?? null;
        token.avatarUrl = (u.avatarUrl as string | null) ?? null;
        token.isSuperAdmin = (u.isSuperAdmin as boolean) ?? false;
      }
      if (trigger === "update" && session) {
        if (session.mustChangePassword !== undefined)
          token.mustChangePassword = session.mustChangePassword;
        if (session.nickname !== undefined) token.nickname = session.nickname;
        if (session.avatarUrl !== undefined) token.avatarUrl = session.avatarUrl;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
        session.user.isActive = token.isActive as boolean;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.nickname = token.nickname ?? null;
        session.user.avatarUrl = token.avatarUrl ?? null;
        session.user.isSuperAdmin = token.isSuperAdmin ?? false;
      }
      return session;
    },
  },
};
