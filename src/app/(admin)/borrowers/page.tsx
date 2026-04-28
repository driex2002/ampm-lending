import type { Metadata } from "next";
import { BorrowersView } from "@/components/admin/borrowers-view";

export const metadata: Metadata = { title: "Borrowers" };

export default function BorrowersPage() {
  return <BorrowersView />;
}
