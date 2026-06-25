import type { Metadata } from "next";
import { content } from "@/content/en";
import { PortalProfile } from "@/components/store/PortalProfile";
import { loadPortalProfilePageData } from "@/lib/data/portal-profile";

interface BusinessOwnerProfilePageProps {
  searchParams: Promise<{ section?: string; storeId?: string }>;
}

export default async function BusinessOwnerProfilePage({
  searchParams,
}: BusinessOwnerProfilePageProps) {
  const params = await searchParams;
  const profile = await loadPortalProfilePageData("BUSINESS_OWNER", params);

  return <PortalProfile {...profile} />;
}

export const metadata: Metadata = {
  title: content.store.ownerShell.profile.pageTitle,
};
