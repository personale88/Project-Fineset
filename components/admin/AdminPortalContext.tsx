"use client";

import { createContext, useContext } from "react";
import type { AdminPermissions, AdminPortalRole } from "@/types";

interface AdminPortalContextValue {
  role: AdminPortalRole;
  permissions: AdminPermissions;
}

const AdminPortalContext = createContext<AdminPortalContextValue | null>(null);

export function AdminPortalProvider({
  role,
  permissions,
  children,
}: AdminPortalContextValue & { children: React.ReactNode }) {
  return (
    <AdminPortalContext.Provider value={{ role, permissions }}>
      {children}
    </AdminPortalContext.Provider>
  );
}

export function useAdminPortal(): AdminPortalContextValue {
  const value = useContext(AdminPortalContext);
  if (!value) {
    throw new Error("useAdminPortal must be used within AdminPortalProvider");
  }
  return value;
}

export function useAdminPortalOptional(): AdminPortalContextValue | null {
  return useContext(AdminPortalContext);
}
