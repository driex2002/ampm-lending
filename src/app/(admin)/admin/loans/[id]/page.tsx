import type { Metadata } from "next";
import { LoanDetailView } from "@/components/admin/loan-detail-view";

export const metadata: Metadata = { title: "Loan Detail" };

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LoanDetailView id={id} />;
}
