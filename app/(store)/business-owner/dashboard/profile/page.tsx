import type { Metadata } from "next";
import { content } from "@/content/en";
import { PortalProfile } from "@/components/store/PortalProfile";
import { parseProfileSection } from "@/components/store/profile/profile-scope";
import { fetchInitialStoreStaff } from "@/lib/data/staff";
import { prisma } from "@/lib/db/prisma";
import { getPlatformBranding } from "@/lib/platform/branding";
import { requirePortalSession } from "@/lib/auth/require-portal-session";

interface BusinessOwnerProfilePageProps {
  searchParams: Promise<{ section?: string; storeId?: string }>;
}

export default async function BusinessOwnerProfilePage({
  searchParams,
}: BusinessOwnerProfilePageProps) {
  const [{ section }, session, branding] = await Promise.all([
    searchParams,
    requirePortalSession("BUSINESS_OWNER"),
    getPlatformBranding(),
  ]);

  const profile = await prisma.appUser.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true },
  });

  let initialStaff: Awaited<ReturnType<typeof fetchInitialStoreStaff>> = null;
  try {
    initialStaff = await fetchInitialStoreStaff();
  } catch (error) {
    console.error("[business-owner-profile] initial staff failed", error);
  }

  return (
    <PortalProfile
      portalRole="BUSINESS_OWNER"
      account={{
        name: profile?.name?.trim() || session.email.split("@")[0] || "Business owner",
        email: profile?.email ?? session.email,
      }}
      supportContact={{
        platformName: branding.platformName,
        supportEmail: branding.supportEmail,
        supportPhone: branding.supportPhone,
      }}
      initialStaff={initialStaff?.data}
      initialStaffStoreId={initialStaff?.storeId}
      initialSection={parseProfileSection(section)}
    />
  );
}

export const metadata: Metadata = {
  title: content.store.ownerShell.profile.pageTitle,
};
