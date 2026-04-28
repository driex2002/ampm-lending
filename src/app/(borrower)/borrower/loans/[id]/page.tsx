import type { Metadata } from "next";
import { BorrowerLoanDetailView } from "@/components/borrower/loan-detail-view";

export const metadata: Metadata = { title: "Loan Details" };

export default async function BorrowerLoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BorrowerLoanDetailView id={id} />;
}
