"use client";

import { useSyncExternalStore } from "react";

/** True after hydration; false during SSR. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
