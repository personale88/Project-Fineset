"use client";

import { AdminImpersonationBanner } from "@/components/admin/AdminImpersonationBanner";
import type { Content } from "@/content/en";
import type { AdminSession } from "@/types";

interface AdminPortalExtrasProps {
  session: AdminSession;
  impersonationCopy: Content["admin"]["impersonation"];
  impersonatedStoreName?: string;
  children: React.ReactNode;
}

export function AdminPortalExtras({
  session,
  impersonationCopy,
  impersonatedStoreName,
  children,
}: AdminPortalExtrasProps) {
  return (
    <>
      <AdminImpersonationBanner
        copy={impersonationCopy}
        session={session}
        storeName={impersonatedStoreName}
      />
      {children}
    </>
  );
}
