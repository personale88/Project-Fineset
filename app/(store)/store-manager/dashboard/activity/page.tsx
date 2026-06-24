import { redirect } from "next/navigation";
import { portalProfileSectionPath } from "@/lib/utils/store-dashboard-url";

export default function StoreManagerActivityPage() {
  redirect(portalProfileSectionPath("STORE_MANAGER", "activity"));
}
