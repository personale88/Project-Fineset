import type { Metadata } from "next";
import { content } from "@/content/en";
import { PortalProfile } from "@/components/store/PortalProfile";
import { loadPortalProfilePageData } from "@/lib/data/portal-profile";

interface StoreManagerProfilePageProps {
  searchParams: Promise<{ section?: string }>;
}

export default async function StoreManagerProfilePage({
  searchParams,
}: StoreManagerProfilePageProps) {
  const params = await searchParams;
  const profile = await loadPortalProfilePageData("STORE_MANAGER", params);

  return <PortalProfile {...profile} />;
}

export const metadata: Metadata = {
  title: content.store.managerShell.profile.pageTitle,
};
