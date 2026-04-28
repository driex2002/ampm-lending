import type { Metadata } from "next";
import { BorrowerDashboardView } from "@/components/borrower/dashboard-view";

export const metadata: Metadata = { title: "My Dashboard" };

export default function BorrowerDashboardPage() {
  return <BorrowerDashboardView />;
}
