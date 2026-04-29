import type { Metadata } from "next";
import { AdminsView } from "@/components/admin/admins-view";

export const metadata: Metadata = { title: "Admin Accounts" };

export default function AdminsPage() {
  return <AdminsView />;
}
