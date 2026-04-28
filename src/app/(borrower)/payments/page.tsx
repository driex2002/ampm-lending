import type { Metadata } from "next";
import { BorrowerPaymentsView } from "@/components/borrower/payments-view";

export const metadata: Metadata = { title: "My Payments" };

export default function BorrowerPaymentsPage() {
  return <BorrowerPaymentsView />;
}
