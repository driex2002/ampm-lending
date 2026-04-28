import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function BorrowerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.mustChangePassword) redirect("/change-password");

  return (
    <div className="min-h-screen bg-gray-50">
      <BorrowerNav user={session.user} />
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

function BorrowerNav({ user }: { user: any }) {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-brand-700">AMPM Lending</span>
          <div className="hidden sm:flex items-center gap-1">
            {[
              { href: "/borrower/dashboard", label: "Dashboard" },
              { href: "/borrower/loans", label: "My Loans" },
              { href: "/borrower/payments", label: "Payments" },
              { href: "/borrower/profile", label: "Profile" },
            ].map(({ href, label }) => (
              <a key={href} href={href} className="px-3 py-1.5 text-sm text-gray-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition">
                {label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 hidden sm:block">{user.name ?? user.email}</span>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="text-sm text-gray-500 hover:text-red-600 transition">Sign out</button>
          </form>
        </div>
      </div>
    </nav>
  );
}
