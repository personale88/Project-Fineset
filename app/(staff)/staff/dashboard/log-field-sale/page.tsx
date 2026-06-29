import { redirect } from "next/navigation";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";

export default function StaffLogFieldSaleRedirectPage() {
  redirect(`${STAFF_DASHBOARD_PATH}/field-sales`);
}
