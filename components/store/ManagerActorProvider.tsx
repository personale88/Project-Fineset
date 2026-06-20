"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";

interface ManagerActorContextValue {
  staffLinked: boolean;
}

interface ActorStatusResponse {
  linked: boolean;
  staffId: string | null;
  storeId: string | null;
}

const ManagerActorContext = createContext<ManagerActorContextValue | null>(null);

export function ManagerActorProvider({
  staffLinked: initialStaffLinked,
  children,
}: {
  staffLinked: boolean;
  children: ReactNode;
}) {
  const { data } = useQuery({
    queryKey: ["manager-actor-status"],
    queryFn: () => apiFetch<ActorStatusResponse>("/api/staff/actor-status"),
    initialData: { linked: initialStaffLinked, staffId: null, storeId: null },
    ...LIVE_QUERY_OPTIONS,
  });

  const staffLinked = data?.linked ?? initialStaffLinked;

  return (
    <ManagerActorContext.Provider value={{ staffLinked }}>
      {children}
    </ManagerActorContext.Provider>
  );
}

export function useManagerActor(): ManagerActorContextValue {
  const ctx = useContext(ManagerActorContext);
  if (!ctx) {
    throw new Error("useManagerActor must be used within ManagerActorProvider");
  }
  return ctx;
}
