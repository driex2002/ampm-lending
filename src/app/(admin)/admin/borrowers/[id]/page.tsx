import type { Metadata } from "next";
import { BorrowerDetailView } from "@/components/admin/borrower-detail-view";

export const metadata: Metadata = { title: "Borrower Detail" };

export default async function BorrowerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BorrowerDetailView id={id} />;
}
