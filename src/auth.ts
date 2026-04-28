/**
 * NextAuth v5 (Auth.js) Configuration
 *
 * Strategy decisions:
 * - JWT sessions (stateless, works on serverless/edge)
 * - Credentials provider: email + password
 * - Google OAuth: email must EXACTLY match registered system email
 * - mustChangePassword enforced in session callbacks
 * - login attempt tracking + account lockout in credentials authorize
 */
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { auditLogin } from "@/lib/audit";
import type { NextAuthConfig } from "next-auth";

const MAX_LOGIN_ATTEMPTS = parseInt(
  process.env.MAX_LOGIN_ATTEMPTS ?? "5",
  10
);
const LOCKOUT_MINUTES = parseInt(
  process.env.LOGIN_LOCKOUT_MINUTES ?? "15",
  10
);

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    // ----------------------------------------------------------
    // GOOGLE OAUTH
    // ----------------------------------------------------------
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    // ----------------------------------------------------------
    // CREDENTIALS (Email + Password)
    // ----------------------------------------------------------
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        if (!user.isActive || user.deletedAt) {
          throw new Error("Account is inactive. Contact your administrator.");
        }

        // Check account lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const minutesLeft = Math.ceil(
            (user.lockedUntil.getTime() - Date.now()) / 60000
          );
          throw new Error(
            `Account locked. Try again in ${minutesLeft} minute(s).`
          );
        }

        const isValid = await verifyPassword(password, user.password);

        if (!isValid) {
          const newAttempts = user.loginAttempts + 1;
          const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;

          await db.user.update({
            where: { id: user.id },
            data: {
              loginAttempts: newAttempts,
              lockedUntil: shouldLock
                ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
                : null,
            },
          });

          if (shouldLock) {
            throw new Error(
              `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`
            );
          }

          throw new Error("Invalid email or password");
        }

        // Reset login attempts on success
        await db.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });

        await auditLogin(user.id, user.role);

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          isActive: user.isActive,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    }),
  ],

  callbacks: {
    // -------------------------------------------------------
    // signIn: block Google OAuth if email not registered
    // -------------------------------------------------------
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingUser = await db.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          // ACCESS DENIED — email not in system
          return "/login?error=GoogleEmailNotRegistered";
        }

        if (!existingUser.isActive || existingUser.deletedAt) {
          return "/login?error=AccountInactive";
        }

        // Update last login
        await db.user.update({
          where: { id: existingUser.id },
          data: { lastLoginAt: new Date() },
        });

        await auditLogin(existingUser.id, existingUser.role);
      }
      return true;
    },

    // -------------------------------------------------------
    // JWT: embed role & mustChangePassword into token
    // -------------------------------------------------------
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Initial sign in
        const dbUser = await db.user.findUnique({
          where: { email: token.email! },
          select: {
            id: true,
            role: true,
            mustChangePassword: true,
            isActive: true,
            firstName: true,
            lastName: true,
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.mustChangePassword = dbUser.mustChangePassword;
          token.isActive = dbUser.isActive;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
        }
      }

      if (trigger === "update" && session) {
        // Allow session update (e.g., after password change)
        token.mustChangePassword = session.mustChangePassword;
      }

      return token;
    },

    // -------------------------------------------------------
    // Session: expose token fields to client
    // -------------------------------------------------------
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
        session.user.isActive = token.isActive as boolean;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
