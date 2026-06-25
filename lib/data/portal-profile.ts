import { cache } from "react";
import { parseProfileSection } from "@/components/store/profile/profile-scope";
import type { PortalProfileAccount } from "@/components/store/PortalProfile";
import type { PortalSupportContact } from "@/components/store/profile/PortalProfileSupport";
import { requirePortalSession } from "@/lib/auth/require-portal-session";
import { fetchInitialStoreStaff } from "@/lib/data/staff";
import { prisma } from "@/lib/db/prisma";
import { getPlatformBranding } from "@/lib/platform/branding";
import type { getStaff } from "@/lib/api/staff";
import type { ManagerStoreOption } from "@/types";

export interface PortalProfilePageData {
  portalRole: "BUSINESS_OWNER" | "STORE_MANAGER";
  account: PortalProfileAccount;
  supportContact: PortalSupportContact;
  assignedStore?: ManagerStoreOption | null;
  initialStaff?: Awaited<ReturnType<typeof getStaff>>;
  initialStaffStoreId?: string;
  initialSection: ReturnType<typeof parseProfileSection>;
}

function fallbackAccountName(
  portalRole: PortalProfilePageData["portalRole"],
  profileName: string | null | undefined,
  email: string,
): string {
  const trimmed = profileName?.trim();
  if (trimmed) return trimmed;
  const localPart = email.split("@")[0];
  if (localPart) return localPart;
  return portalRole === "BUSINESS_OWNER" ? "Business owner" : "Store manager";
}

export const loadPortalProfilePageData = cache(async function loadPortalProfilePageData(
  portalRole: "BUSINESS_OWNER" | "STORE_MANAGER",
  searchParams: { section?: string; storeId?: string },
): Promise<PortalProfilePageData> {
  const [session, branding] = await Promise.all([
    requirePortalSession(portalRole),
    getPlatformBranding(),
  ]);

  const initialSection = parseProfileSection(searchParams.section);

  if (portalRole === "BUSINESS_OWNER") {
    const [profile, initialStaffResult] = await Promise.all([
      prisma.appUser.findUnique({
        where: { id: session.userId },
        select: { name: true, email: true },
      }),
      fetchInitialStoreStaff().catch((error) => {
        console.error("[portal-profile] initial staff failed", error);
        return null;
      }),
    ]);

    return {
      portalRole,
      account: {
        name: fallbackAccountName(portalRole, profile?.name, session.email),
        email: profile?.email ?? session.email,
      },
      supportContact: {
        platformName: branding.platformName,
        supportEmail: branding.supportEmail,
        supportPhone: branding.supportPhone,
      },
      initialStaff: initialStaffResult?.data,
      initialStaffStoreId: initialStaffResult?.storeId,
      initialSection,
    };
  }

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
      console.error("[portal-profile] initial staff failed", error);
      return null;
    }),
  ]);

  return {
    portalRole,
    account: {
      name: fallbackAccountName(portalRole, profile?.name, session.email),
      email: profile?.email ?? session.email,
    },
    supportContact: {
      platformName: branding.platformName,
      supportEmail: branding.supportEmail,
      supportPhone: branding.supportPhone,
    },
    assignedStore: store
      ? {
          id: store.id,
          name: store.name,
          city: store.city ?? "",
          state: store.state ?? "",
        }
      : null,
    initialStaff: initialStaffResult?.data,
    initialStaffStoreId: initialStaffResult?.storeId,
    initialSection,
  };
});
