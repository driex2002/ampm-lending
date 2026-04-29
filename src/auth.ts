/**
 * NextAuth v5 (Auth.js) Configuration
 *
 * Strategy decisions:
 * - JWT sessions (stateless, works on serverless/edge)
 * - Credentials provider: email + password
 * - Google OAuth: email must EXACTLY match registered system email
 * - mustChangePassword enforced in session callbacks
 * - login attempt tracking + account lockout in credentials authorize
 *
 * Edge-safe callbacks (jwt, session) live in auth.config.ts.
 * This file is Node.js-only and must NOT be imported by middleware.
 */
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { auditLogin } from "@/lib/audit";
import { sendNotification, isNotifEnabled } from "@/lib/email/mailer";
import { loginAlertTemplate } from "@/lib/email/templates";
import { format } from "date-fns";
import { authConfig } from "./auth.config";

const MAX_LOGIN_ATTEMPTS = parseInt(
  process.env.MAX_LOGIN_ATTEMPTS ?? "5",
  10
);
const LOCKOUT_MINUTES = parseInt(
  process.env.LOGIN_LOCKOUT_MINUTES ?? "15",
  10
);

// Super admin is always allowed to login and cannot be suspended/deleted
export const SUPER_ADMIN_EMAIL = (
  process.env.SUPER_ADMIN_EMAIL ?? "driex2002@gmail.com"
).toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    // ----------------------------------------------------------
    // GOOGLE OAUTH
    // ----------------------------------------------------------
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
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
          select: {
            id: true, email: true, role: true, password: true,
            mustChangePassword: true, isActive: true, deletedAt: true,
            firstName: true, lastName: true, nickname: true, avatarUrl: true,
            loginAttempts: true, lockedUntil: true,
          },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        // Super admin can always login regardless of isActive flag
        const isSuperAdmin = email === SUPER_ADMIN_EMAIL;
        if (!isSuperAdmin && (!user.isActive || user.deletedAt)) {
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

        // Fire login alert (borrowers only, non-blocking)
        if (user.role === "BORROWER") {
          const { subject, html } = loginAlertTemplate({
            firstName: user.firstName,
            loginTime: format(new Date(), "MMM dd, yyyy hh:mm:ss a"),
          });
          isNotifEnabled(user.id, "login_alert").then((enabled) => {
            if (enabled) {
              sendNotification({
                recipientId: user.id,
                recipientEmail: user.email,
                type: "LOGIN_ALERT",
                subject,
                html,
                metadata: { loginTime: new Date().toISOString() },
              }).catch(console.error);
            }
          }).catch(console.error);
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          isActive: user.isActive,
          firstName: user.firstName,
          lastName: user.lastName,
          nickname: user.nickname ?? null,
          avatarUrl: user.avatarUrl ?? null,
          isSuperAdmin: email === SUPER_ADMIN_EMAIL,
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

        const isSuperAdmin = existingUser.email.toLowerCase() === SUPER_ADMIN_EMAIL;
        if (!isSuperAdmin && (!existingUser.isActive || existingUser.deletedAt)) {
          return "/login?error=AccountInactive";
        }

        // Update last login
        await db.user.update({
          where: { id: existingUser.id },
          data: { lastLoginAt: new Date() },
        });

        await auditLogin(existingUser.id, existingUser.role);

        // Fire login alert for borrowers (non-blocking)
        if (existingUser.role === "BORROWER") {
          const { subject, html } = loginAlertTemplate({
            firstName: existingUser.firstName,
            loginTime: format(new Date(), "MMM dd, yyyy hh:mm:ss a"),
          });
          isNotifEnabled(existingUser.id, "login_alert").then((enabled) => {
            if (enabled) {
              sendNotification({
                recipientId: existingUser.id,
                recipientEmail: existingUser.email,
                type: "LOGIN_ALERT",
                subject,
                html,
                metadata: { loginTime: new Date().toISOString(), provider: "google" },
              }).catch(console.error);
            }
          }).catch(console.error);
        }
      }
      return true;
    },

    // -------------------------------------------------------
    // JWT: embed role & mustChangePassword into token
    // (overrides the base jwt in authConfig to add DB enrichment
    // for Google OAuth where user object lacks role/etc.)
    // -------------------------------------------------------
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Initial sign in — fetch full user data from DB
        // (needed for Google OAuth where the user object is the OAuth profile)
        const dbUser = await db.user.findUnique({
          where: { email: token.email! },
          select: {
            id: true,
            role: true,
            mustChangePassword: true,
            isActive: true,
            firstName: true,
            lastName: true,
            nickname: true,
            avatarUrl: true,
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.mustChangePassword = dbUser.mustChangePassword;
          token.isActive = dbUser.isActive;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
          token.nickname = dbUser.nickname ?? null;
          token.avatarUrl = dbUser.avatarUrl ?? null;
          token.isSuperAdmin = (token.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL;
        }
      }

      if (trigger === "update" && session) {
        if (session.mustChangePassword !== undefined)
          token.mustChangePassword = session.mustChangePassword;
        if (session.nickname !== undefined) token.nickname = session.nickname;
        if (session.avatarUrl !== undefined) token.avatarUrl = session.avatarUrl;
      }

      return token;
    },

    // session callback inherited from authConfig (no override needed)
    session: authConfig.callbacks!.session!,
  },
});

