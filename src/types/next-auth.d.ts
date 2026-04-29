/**
 * NextAuth type augmentation
 * Extends the default Session and JWT types with our custom fields
 */
import "next-auth";
import "next-auth/jwt";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      role: Role | string;
      mustChangePassword: boolean;
      isActive: boolean;
      firstName: string;
      lastName: string;
      nickname?: string | null;
      avatarUrl?: string | null;
      isSuperAdmin?: boolean;
    };
  }

  interface User {
    id: string;
    role: Role | string;
    mustChangePassword: boolean;
    isActive: boolean;
    firstName: string;
    lastName: string;
    nickname?: string | null;
    avatarUrl?: string | null;
    isSuperAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role | string;
    mustChangePassword: boolean;
    isActive: boolean;
    firstName: string;
    lastName: string;
    nickname?: string | null;
    avatarUrl?: string | null;
    isSuperAdmin?: boolean;
  }
}
