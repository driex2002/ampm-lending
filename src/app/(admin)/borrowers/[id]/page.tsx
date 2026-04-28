import type { Metadata } from "next";
import { BorrowerDetailView } from "@/components/admin/borrower-detail-view";

export const metadata: Metadata = { title: "Borrower Detail" };

export default function BorrowerDetailPage({ params }: { params: { id: string } }) {
  return <BorrowerDetailView id={params.id} />;
}
