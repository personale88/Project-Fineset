import type { ApiErrorResponse } from "@/types";
import { ApiError } from "@/types";
import {
  isAdminPortalPagePath,
  redirectToSignInAfterUnauthorized,
} from "@/lib/auth/client-session-guard";
import { BILLING_RESTRICTED_CODE } from "@/lib/billing/constants";

export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let body: ApiErrorResponse = { message: "Request failed" };
    try {
      body = (await res.json()) as ApiErrorResponse;
    } catch {
      body = { message: res.statusText || "Request failed" };
    }

    if (
      res.status === 402 &&
      "code" in body &&
      body.code === BILLING_RESTRICTED_CODE
    ) {
      return { billingRestricted: true } as T;
    }

    if (
      res.status === 401 &&
      typeof window !== "undefined" &&
      isAdminPortalPagePath(window.location.pathname)
    ) {
      redirectToSignInAfterUnauthorized(
        `${window.location.pathname}${window.location.search}`,
      );
    }

    throw new ApiError(res.status, body);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export function buildQueryString(params: object): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}
