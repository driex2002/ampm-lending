import type { Metadata } from "next";
import { LoanDetailView } from "@/components/admin/loan-detail-view";

export const metadata: Metadata = { title: "Loan Detail" };

export default function LoanDetailPage({ params }: { params: { id: string } }) {
  return <LoanDetailView id={params.id} />;
}
