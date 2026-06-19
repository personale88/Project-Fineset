import { content } from "@/content/en";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { ApiError } from "@/types";
import type { Content } from "@/content/en";

type StaffCallsCopy = Content["staff"]["calls"];

export function getStaffCallsErrorMessage(
  error: unknown,
  copy: StaffCallsCopy,
): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return copy.loadErrorUnauthorized;
    }
    if (error.status === 503) {
      return copy.loadErrorUnavailable;
    }
  }

  const message = getPortalErrorMessage(error, content.errors);
  if (message !== content.errors.generic) {
    return message;
  }

  return copy.loadErrorGeneric;
}
