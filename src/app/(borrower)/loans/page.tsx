import type { Metadata } from "next";
import { BorrowerLoansView } from "@/components/borrower/loans-view";

export const metadata: Metadata = { title: "My Loans" };

export default function BorrowerLoansPage() {
  return <BorrowerLoansView />;
}
