import { content } from "@/content/en";
import { AdminBusinessAnalytics } from "@/components/admin/AdminBusinessAnalytics";

export default function AdminAnalyticsPage() {
  return (
    <AdminBusinessAnalytics
      copy={content.admin.analytics}
      nav={content.admin.nav}
      categories={content.admin.categories}
      common={content.common}
      errors={content.errors}
    />
  );
}
