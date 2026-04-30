"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { signOut } from "next-auth/react";

const NAV_LINKS = [
  { href: "/borrower/dashboard", label: "Dashboard" },
  { href: "/borrower/loans", label: "My Loans" },
  { href: "/borrower/payments", label: "Payments" },
  { href: "/borrower/profile", label: "Profile" },
];

interface BorrowerNavProps {
  user: {
    firstName?: string | null;
    lastName?: string | null;
    nickname?: string | null;
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  };
  appName: string;
  initials: string;
}

export function BorrowerNav({ user, appName, initials }: BorrowerNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = user.nickname || user.firstName || user.name || user.email;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="sm:hidden p-2 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <span className="font-bold text-brand-700">{appName}</span>

          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition"
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Avatar */}
          <a href="/borrower/profile" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-brand-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <span className="text-sm text-gray-600 hidden sm:block">{displayName}</span>
          </a>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-gray-500 hover:text-red-600 transition"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white shadow-md">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="block px-5 py-3.5 text-sm font-medium text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition border-b border-gray-50 last:border-0"
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
