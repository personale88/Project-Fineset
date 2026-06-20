import { redirect } from "next/navigation";
import { storeManagerHomeHubHref } from "@/lib/utils/store-dashboard-url";

export default function StoreManagerMyWorkPage() {
  redirect(storeManagerHomeHubHref("my-work"));
}
