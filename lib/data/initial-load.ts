/** Discriminated result for server-side initial data fetches (SSR → client hydration). */
export type InitialLoadResult<T> =
  | { ok: true; data: T }
  | { ok: false };

export function initialLoadSuccess<T>(data: T): InitialLoadResult<T> {
  return { ok: true, data };
}

export function initialLoadFailed<T>(): InitialLoadResult<T> {
  return { ok: false };
}

export function unwrapInitialLoad<T>(
  result: InitialLoadResult<T> | null | undefined,
): T | undefined {
  if (result?.ok) return result.data;
  return undefined;
}

export function initialLoadFailedFlag(
  result: InitialLoadResult<unknown> | null | undefined,
): boolean {
  return result != null && !result.ok;
}
