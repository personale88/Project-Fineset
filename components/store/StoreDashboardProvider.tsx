"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  parseStoreIdFromPath,
  SELECTED_STORE_STORAGE_KEY,
} from "@/lib/utils/store-dashboard-url";
import type { MyStoresResponse, StorePortalSession, ManagerStoreOption } from "@/types";

interface StoreDashboardContextValue {
  storeId: string | null;
  setStoreId: (id: string) => void;
  /** When set, portfolio widgets (work queue, notifications) scope to one store; null = all stores. */
  portfolioWorkQueueStoreId: string | null;
  setPortfolioWorkQueueStoreId: (id: string | null) => void;
  stores: ManagerStoreOption[];
  hasMultipleStores: boolean;
  isSingleStoreManager: boolean;
}

const StoreDashboardContext = createContext<StoreDashboardContextValue | null>(
  null,
);

interface StoreDashboardProviderProps {
  children: ReactNode;
  portalRole: StorePortalSession["role"];
  assignedStoreId: string;
  initialMyStores?: MyStoresResponse;
}

function SingleStoreDashboardProvider({
  children,
  assignedStoreId,
}: {
  children: ReactNode;
  assignedStoreId: string;
}) {
  const value = useMemo(
    () => ({
      storeId: assignedStoreId,
      setStoreId: () => {},
      portfolioWorkQueueStoreId: null,
      setPortfolioWorkQueueStoreId: () => {},
      stores: [],
      hasMultipleStores: false,
      isSingleStoreManager: true,
    }),
    [assignedStoreId],
  );

  return (
    <StoreDashboardContext.Provider value={value}>
      {children}
    </StoreDashboardContext.Provider>
  );
}

function resolveStoreId(
  stores: ManagerStoreOption[],
  candidates: (string | null | undefined)[],
  fallback: string,
): string {
  const allowedIds = new Set(stores.map((store) => store.id));
  for (const id of candidates) {
    if (id && allowedIds.has(id)) return id;
  }
  return fallback;
}

function MultiStoreDashboardProvider({
  children,
  assignedStoreId,
  initialMyStores,
}: {
  children: ReactNode;
  assignedStoreId: string;
  initialMyStores: MyStoresResponse;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const stores = initialMyStores.data;
  const pathStoreId = parseStoreIdFromPath(pathname);
  const queryStoreId = searchParams.get("storeId");
  const [manualStoreId, setManualStoreId] = useState<string | null>(null);
  const [persistedStoreId, setPersistedStoreId] = useState<string | null>(null);
  const [portfolioWorkQueueStoreId, setPortfolioWorkQueueStoreIdState] =
    useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(SELECTED_STORE_STORAGE_KEY);
    if (stored) {
      setPersistedStoreId(stored);
    }
  }, []);

  const resolvedStoreId = useMemo(
    () =>
      resolveStoreId(
        stores,
        [
          pathStoreId,
          manualStoreId,
          queryStoreId,
          persistedStoreId,
          initialMyStores.selectedStoreId,
          stores[0]?.id,
        ],
        pathStoreId ?? queryStoreId ?? assignedStoreId,
      ),
    [
      assignedStoreId,
      pathStoreId,
      manualStoreId,
      queryStoreId,
      persistedStoreId,
      initialMyStores.selectedStoreId,
      stores,
    ],
  );

  useEffect(() => {
    if (resolvedStoreId) {
      window.localStorage.setItem(SELECTED_STORE_STORAGE_KEY, resolvedStoreId);
    }
  }, [resolvedStoreId]);

  const setStoreId = useCallback((id: string) => {
    setManualStoreId(id);
    setPersistedStoreId(id);
    window.localStorage.setItem(SELECTED_STORE_STORAGE_KEY, id);
  }, []);

  const setPortfolioWorkQueueStoreId = useCallback((id: string | null) => {
    setPortfolioWorkQueueStoreIdState(id);
    if (id) {
      setStoreId(id);
    }
  }, [setStoreId]);

  const value = useMemo(
    () => ({
      storeId: resolvedStoreId,
      setStoreId,
      portfolioWorkQueueStoreId,
      setPortfolioWorkQueueStoreId,
      stores,
      hasMultipleStores: stores.length > 1,
      isSingleStoreManager: false,
    }),
    [
      portfolioWorkQueueStoreId,
      resolvedStoreId,
      setPortfolioWorkQueueStoreId,
      setStoreId,
      stores,
    ],
  );

  return (
    <StoreDashboardContext.Provider value={value}>
      {children}
    </StoreDashboardContext.Provider>
  );
}

export function StoreDashboardProvider({
  children,
  portalRole,
  assignedStoreId,
  initialMyStores,
}: StoreDashboardProviderProps) {
  if (portalRole === "STORE_MANAGER") {
    return (
      <SingleStoreDashboardProvider assignedStoreId={assignedStoreId}>
        {children}
      </SingleStoreDashboardProvider>
    );
  }

  if (!initialMyStores) {
    throw new Error("Business owner dashboard requires initialMyStores");
  }

  return (
    <MultiStoreDashboardProvider
      assignedStoreId={assignedStoreId}
      initialMyStores={initialMyStores}
    >
      {children}
    </MultiStoreDashboardProvider>
  );
}

export function useStoreDashboard(): StoreDashboardContextValue {
  const ctx = useContext(StoreDashboardContext);
  if (!ctx) {
    throw new Error("useStoreDashboard must be used within StoreDashboardProvider");
  }
  return ctx;
}
