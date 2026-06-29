import { isUnauthorizedApiError } from "@/lib/auth/client-session-guard";

export function isAutomationConfigLoadFailure(params: {
  error: unknown;
  status: "error" | "pending" | "success";
  isRefetchError?: boolean;
}): boolean {
  if (isUnauthorizedApiError(params.error)) return false;
  if (params.status === "error") return true;
  if (params.isRefetchError) return true;
  return Boolean(params.error);
}

export function shouldPersistAutomationConfigLoadFailure(params: {
  liveFailure: boolean;
  stickyFailure: boolean;
}): boolean {
  return params.liveFailure || params.stickyFailure;
}
