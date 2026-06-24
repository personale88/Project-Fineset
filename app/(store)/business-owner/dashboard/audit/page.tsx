import { redirect } from "next/navigation";
import { portalProfileSectionPath } from "@/lib/utils/store-dashboard-url";

export default function OwnerAuditPage() {
  redirect(portalProfileSectionPath("BUSINESS_OWNER", "activity"));
}
