import { content } from "@/content/en";
import { AdminSettingsCenter } from "@/components/admin/AdminSettingsCenter";

export default function AdminSettingsPage() {
  return <AdminSettingsCenter admin={content.admin} />;
}
