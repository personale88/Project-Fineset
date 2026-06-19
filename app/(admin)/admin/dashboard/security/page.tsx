import { AdminDashboardNav } from "@/components/admin/AdminDashboardNav";
import { content } from "@/content/en";

export default function AdminSecurityPage() {
  return (
    <div className="space-y-6">
      <AdminDashboardNav labels={content.admin.nav} />
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          Security settings
        </h1>
        <p className="text-sm text-text-secondary">
          Two-factor authentication is not enabled in this deployment. Use strong
          passwords and protect your admin email account.
        </p>
      </div>
    </div>
  );
}
