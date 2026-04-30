"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Bell, Menu, X } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { useMobileMenu } from "./mobile-menu-context";

export function AdminHeader() {
  const { data: session } = useSession();
  const firstName = session?.user?.nickname || session?.user?.firstName || "Admin";
  const lastName = session?.user?.nickname ? "" : (session?.user?.lastName ?? "");
  const avatarUrl = session?.user?.avatarUrl;
  const { isOpen, toggleMenu } = useMobileMenu();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={toggleMenu}
          className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
          title={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <h2 className="text-gray-800 font-semibold text-sm hidden sm:block">
          Welcome back, {firstName}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications placeholder */}
        <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition">
          <Bell size={18} />
        </button>

        {/* Admin avatar — links to profile */}
        <Link href="/admin/profile" className="flex items-center gap-2 hover:opacity-80 transition">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-brand-600 flex items-center justify-center text-white text-xs font-semibold">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              getInitials(session?.user?.firstName ?? "A", session?.user?.lastName ?? "")
            )}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-700 leading-tight">
              {session?.user?.firstName} {session?.user?.lastName}
            </p>
            <p className="text-xs text-gray-400">
              {session?.user?.isSuperAdmin ? "Super Admin" : "Administrator"}
            </p>
          </div>
        </Link>
      </div>
    </header>
  );
}
