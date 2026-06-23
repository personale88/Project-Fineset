import { redirect } from "next/navigation";

export default function AdminStoresRedirectPage() {
  redirect("/admin/dashboard/accounts");
}
