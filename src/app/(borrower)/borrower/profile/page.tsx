import type { Metadata } from "next";
import { BorrowerProfileView } from "@/components/borrower/profile-view";

export const metadata: Metadata = { title: "My Profile" };

export default function BorrowerProfilePage() {
  return <BorrowerProfileView />;
}
