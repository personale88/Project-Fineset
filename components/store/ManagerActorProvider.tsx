"use client";

import { createContext, useContext, type ReactNode } from "react";

interface ManagerActorContextValue {
  staffLinked: boolean;
}

const ManagerActorContext = createContext<ManagerActorContextValue | null>(null);

export function ManagerActorProvider({
  staffLinked,
  children,
}: {
  staffLinked: boolean;
  children: ReactNode;
}) {
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
