import type { Content } from "@/content/en";
import { ApiError } from "@/types";

type ErrorsCopy = Content["errors"];

const GENERIC_API_MESSAGES = new Set(["Request failed", "Validation failed"]);

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof Error && /failed to fetch|network error|load failed/i.test(error.message)) {
    return true;
  }
  return false;
}

function isMeaningfulApiMessage(message: string | undefined): message is string {
  if (!message) return false;
  const trimmed = message.trim();
  if (!trimmed) return false;
  return !GENERIC_API_MESSAGES.has(trimmed);
}

interface ZodFlattenDetails {
  formErrors?: string[];
  fieldErrors?: Record<string, string[]>;
}

function isZodFlattenDetails(value: unknown): value is ZodFlattenDetails {
  if (!value || typeof value !== "object") return false;
  const record = value as ZodFlattenDetails;
  return (
    (record.formErrors === undefined || Array.isArray(record.formErrors)) &&
    (record.fieldErrors === undefined ||
      (typeof record.fieldErrors === "object" && record.fieldErrors !== null))
  );
}

/** Extracts the first human-readable message from a Zod flatten payload. */
export function formatZodFlattenDetails(details: unknown): string | null {
  if (!isZodFlattenDetails(details)) return null;

  for (const message of details.formErrors ?? []) {
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  for (const messages of Object.values(details.fieldErrors ?? {})) {
    if (!Array.isArray(messages)) continue;
    for (const message of messages) {
      if (typeof message === "string" && message.trim()) {
        return message.trim();
      }
    }
  }

  return null;
}

function formatServerDetail(message: string, detail: string | undefined): string {
  const trimmedDetail = detail?.trim();
  if (!trimmedDetail) return message;
  if (message.includes(trimmedDetail)) return message;
  return `${message} ${trimmedDetail}`;
}

/** Maps API/network errors to a staff-facing message. */
export function getPortalErrorMessage(error: unknown, copy: ErrorsCopy): string {
  if (isNetworkError(error)) {
    return "Cannot reach the server. Check your internet connection and try again.";
  }

  if (error instanceof ApiError) {
    const { status, body } = error;
    const validationMessage = formatZodFlattenDetails(body.details);
    const apiMessage = isMeaningfulApiMessage(body.message) ? body.message.trim() : null;

    if (status === 400 && validationMessage) {
      return validationMessage;
    }

    if (apiMessage) {
      if (status === 500 && body.detail?.trim()) {
        return formatServerDetail(apiMessage, body.detail);
      }
      return apiMessage;
    }

    if (status === 400) {
      return copy.validation;
    }

    if (status === 401 || status === 403) {
      return copy.unauthorized;
    }

    if (status === 429) {
      return copy.rateLimited;
    }

    if (status === 503) {
      return "Database connection is temporarily unavailable. Please try again shortly.";
    }

    if (status === 500 && body.detail?.trim()) {
      return formatServerDetail("Internal server error", body.detail);
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return copy.generic;
}
