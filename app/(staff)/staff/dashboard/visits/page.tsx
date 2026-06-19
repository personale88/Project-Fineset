import { redirect } from "next/navigation";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";

export default function StaffVisitsRedirectPage() {
  redirect(`${STAFF_DASHBOARD_PATH}/log-visit`);
}
