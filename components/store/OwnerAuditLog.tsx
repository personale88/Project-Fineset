"use client";

import { PortalStoreActivityLog } from "@/components/store/PortalStoreActivityLog";

export function OwnerAuditLog() {
  return <PortalStoreActivityLog portalRole="BUSINESS_OWNER" />;
}
