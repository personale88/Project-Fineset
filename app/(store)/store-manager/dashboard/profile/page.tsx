import type { Metadata } from "next";
import { content } from "@/content/en";
import { PortalProfile } from "@/components/store/PortalProfile";
import { parseProfileSection } from "@/components/store/profile/profile-scope";
import { fetchInitialStoreStaff } from "@/lib/data/staff";
import { prisma } from "@/lib/db/prisma";
import { getPlatformBranding } from "@/lib/platform/branding";
import { requirePortalSession } from "@/lib/auth/require-portal-session";

interface StoreManagerProfilePageProps {
  searchParams: Promise<{ section?: string }>;
}

export default async function StoreManagerProfilePage({
  searchParams,
}: StoreManagerProfilePageProps) {
  const [{ section }, session, branding] = await Promise.all([
    searchParams,
    requirePortalSession("STORE_MANAGER"),
    getPlatformBranding(),
  ]);

  const [profile, store, initialStaffResult] = await Promise.all([
    prisma.appUser.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true },
    }),
    prisma.store.findUnique({
      where: { id: session.storeId },
      select: { id: true, name: true, city: true, state: true },
    }),
    fetchInitialStoreStaff(session.storeId).catch((error) => {
      console.error("[store-manager-profile] initial staff failed", error);
      return null;
    }),
  ]);

  return (
    <PortalProfile
      portalRole="STORE_MANAGER"
      account={{
        name: profile?.name?.trim() || session.email.split("@")[0] || "Store manager",
        email: profile?.email ?? session.email,
      }}
      supportContact={{
        platformName: branding.platformName,
        supportEmail: branding.supportEmail,
        supportPhone: branding.supportPhone,
      }}
      assignedStore={
        store
          ? {
              id: store.id,
              name: store.name,
              city: store.city ?? "",
              state: store.state ?? "",
            }
          : null
      }
      initialStaff={initialStaffResult?.data}
      initialStaffStoreId={initialStaffResult?.storeId}
      initialSection={parseProfileSection(section)}
    />
  );
}

export const metadata: Metadata = {
  title: content.store.managerShell.profile.pageTitle,
};
