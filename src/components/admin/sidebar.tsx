"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import {
  SquaresFour,
  Users,
  CreditCard,
  CurrencyDollar,
  ChartBar,
  ClipboardText,
  GearSix,
  SignOut,
  ShieldStar,
  UserGear,
  UserCircle,
  SidebarSimple,
  ArrowLineLeft,
  ArrowLineRight,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { useMobileMenu } from "./mobile-menu-context";

const navItems = [
  { href: "/admin/dashboard",  label: "Dashboard",  icon: SquaresFour   },
  { href: "/admin/borrowers",  label: "Borrowers",  icon: Users          },
  { href: "/admin/loans",      label: "Loans",      icon: CreditCard     },
  { href: "/admin/payments",   label: "Payments",   icon: CurrencyDollar },
  { href: "/admin/reports",    label: "Reports",    icon: ChartBar       },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ClipboardText  },
  { href: "/admin/admins",     label: "Admins",     icon: ShieldStar     },
  { href: "/admin/settings",   label: "Settings",   icon: GearSix        },
  { href: "/admin/profile",    label: "My Profile", icon: UserCircle     },
];

interface AppConfig {
  appName: string;
  appIcon: string;
  appFavicon: string;
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { iconWeight } = useTheme();
  const { isOpen: mobileMenuOpen, closeMenu } = useMobileMenu();

  const { data } = useQuery<{ data: AppConfig }>({
    queryKey: ["app-config"],
    queryFn: () => fetch("/api/public/app-config").then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const appName = data?.data?.appName || "AMPM Lending";
  const appIcon = data?.data?.appIcon || "";

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => closeMenu()}
          aria-hidden="true"
        />
      )}
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col bg-brand-900 text-white transition-all duration-300 ease-in-out",
          "fixed md:sticky top-0 h-screen md:h-auto",
          "z-50 md:z-auto",
          "md:flex",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
      {/* Logo / header */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-brand-700",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            {appIcon ? (
              <img src={appIcon} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <span className="text-2xl flex-shrink-0">💳</span>
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight truncate">{appName}</p>
              <p className="text-brand-300 text-xs">Admin Panel</p>
            </div>
          </div>
        )}
        {collapsed && (
          appIcon ? (
            <img src={appIcon} alt="" className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <span className="text-xl">💳</span>
          )
        )}

        {/* Collapse toggle in header — hidden on mobile */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "hidden md:flex items-center justify-center w-8 h-8 rounded-lg transition-colors flex-shrink-0",
            "text-brand-300 hover:text-white hover:bg-brand-700",
            collapsed && "mt-0"
          )}
        >
          <SidebarSimple size={18} weight={iconWeight} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => closeMenu()}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-brand-600 text-white"
                  : "text-brand-200 hover:bg-brand-800 hover:text-white",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} weight={active ? "fill" : iconWeight} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Sign out + collapse */}
      <div className="border-t border-brand-700 p-2 space-y-1">
        {/* Sign Out */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-200 hover:bg-brand-800 hover:text-white transition",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Sign Out" : undefined}
        >
          <SignOut size={18} weight={iconWeight} />
          {!collapsed && "Sign Out"}
        </button>

        {/* Collapse / Expand — hidden on mobile, shown on desktop */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "hidden md:flex w-full items-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs font-medium",
            "bg-brand-800/60 text-brand-300 hover:bg-brand-700 hover:text-white border border-brand-700/50",
            collapsed ? "justify-center" : "justify-between"
          )}
          title={collapsed ? "Expand sidebar" : undefined}
        >
          {collapsed ? (
            <ArrowLineRight size={15} weight="bold" />
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <ArrowLineLeft size={15} weight="bold" />
                Collapse sidebar
              </span>
              <kbd className="text-[10px] bg-brand-700/60 px-1.5 py-0.5 rounded text-brand-400">⌘B</kbd>
            </>
          )}
        </button>

        {/* Close menu button — shown on mobile only */}
        <button
          onClick={() => closeMenu()}
          className="md:hidden w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs font-medium bg-brand-800/60 text-brand-300 hover:bg-brand-700 hover:text-white border border-brand-700/50 justify-center"
        >
          Close Menu
        </button>
      </div>
    </aside>
    </>
  );
}
