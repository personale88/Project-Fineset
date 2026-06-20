import { content } from "@/content/en";
import { BusinessOwnerFollowUpsPageClient } from "@/components/store/BusinessOwnerFollowUpsPageClient";
import { requirePortalSession } from "@/lib/auth/require-portal-session";
import { parseFollowUpFilter } from "@/lib/utils/follow-ups-url";

interface BusinessOwnerFollowUpsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BusinessOwnerFollowUpsPage({
  searchParams,
}: BusinessOwnerFollowUpsPageProps) {
  await requirePortalSession(["BUSINESS_OWNER"]);
  const resolved = await searchParams;

  return (
    <BusinessOwnerFollowUpsPageClient filter={parseFollowUpFilter(resolved.filter)} />
  );
}
