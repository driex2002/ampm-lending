"use client";

import { useSession } from "next-auth/react";
import { Bell, User } from "lucide-react";
import { getInitials } from "@/lib/utils";

export function AdminHeader() {
  const { data: session } = useSession();
  const firstName = session?.user?.firstName ?? "Admin";
  const lastName = session?.user?.lastName ?? "";

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <h2 className="text-gray-800 font-semibold text-sm hidden sm:block">
          Welcome back, {firstName}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications placeholder */}
        <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition">
          <Bell size={18} />
        </button>

        {/* Admin avatar */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-semibold">
            {getInitials(firstName, lastName)}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-700 leading-tight">
              {firstName} {lastName}
            </p>
            <p className="text-xs text-gray-400">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
