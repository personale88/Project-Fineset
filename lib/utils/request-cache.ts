import { cache as reactCache } from "react";

/**
 * React `cache()` in Next.js request scope; identity wrapper in scripts/tests
 * where React does not provide a working cache implementation.
 */
export const requestCache =
  typeof reactCache === "function"
    ? reactCache
    : <T extends (...args: never[]) => unknown>(fn: T): T => fn;
