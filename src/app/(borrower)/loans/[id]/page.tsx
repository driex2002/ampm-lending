import type { Metadata } from "next";
import { BorrowerLoanDetailView } from "@/components/borrower/loan-detail-view";

export const metadata: Metadata = { title: "Loan Details" };

export default function BorrowerLoanDetailPage({ params }: { params: { id: string } }) {
  return <BorrowerLoanDetailView id={params.id} />;
}
