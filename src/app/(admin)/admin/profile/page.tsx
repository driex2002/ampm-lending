import type { Metadata } from "next";
import { AdminProfileView } from "@/components/admin/profile-view";

export const metadata: Metadata = { title: "My Profile" };

export default function AdminProfilePage() {
  return <AdminProfileView />;
}
