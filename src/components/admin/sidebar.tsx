"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, CreditCard, DollarSign, BarChart3,
  FileText, Settings, LogOut, ChevronLeft, ChevronRight,
  Shield, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/borrowers", label: "Borrowers", icon: Users },
  { href: "/admin/loans", label: "Loans", icon: CreditCard },
  { href: "/admin/payments", label: "Payments", icon: DollarSign },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: Shield },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile overlay would go here */}
      <aside
        className={cn(
          "flex flex-col bg-brand-900 text-white transition-all duration-300 ease-in-out",
          "hidden md:flex",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center h-16 px-4 border-b border-brand-700", collapsed && "justify-center")}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="text-2xl">💳</span>
              <div>
                <p className="font-bold text-sm leading-tight">AMPM Lending</p>
                <p className="text-brand-300 text-xs">Admin Panel</p>
              </div>
            </div>
          )}
          {collapsed && <span className="text-xl">💳</span>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-brand-600 text-white"
                    : "text-brand-200 hover:bg-brand-800 hover:text-white",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? label : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-brand-700 p-2 space-y-1">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-200 hover:bg-brand-800 hover:text-white transition",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? "Sign Out" : undefined}
          >
            <LogOut size={18} />
            {!collapsed && "Sign Out"}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-brand-400 hover:text-white hover:bg-brand-800 transition"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </aside>
    </>
  );
}
