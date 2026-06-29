import type { ZodError } from "zod";
import type { PlatformAutomationConfig } from "@/lib/automation/types";
import { formatZodFlattenDetails } from "@/lib/utils/api-error-message";

interface ZodFlattenShape {
  fieldErrors: Record<string, string[] | undefined>;
}

export function zodErrorToFlattenDetails(error: ZodError): {
  formErrors: string[];
  fieldErrors: Record<string, string[]>;
} {
  const formErrors: string[] = [];
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    if (issue.path.length === 0) {
      formErrors.push(issue.message);
      continue;
    }

    const path = issue.path.map(String).join(".");
    const existing = fieldErrors[path] ?? [];
    fieldErrors[path] = [...existing, issue.message];
  }

  return { formErrors, fieldErrors };
}

export function mapAutomationSectionFieldErrorsFromIssues(
  section: keyof PlatformAutomationConfig,
  error: ZodError,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    if (issue.path[0] !== section || issue.path.length < 2) continue;
    const field = String(issue.path[1]);
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}

export function mapAutomationSectionFieldErrors(
  section: keyof PlatformAutomationConfig,
  flatten: ZodFlattenShape,
): Record<string, string> {
  const prefix = `${section}.`;
  const errors: Record<string, string> = {};

  for (const [path, messages] of Object.entries(flatten.fieldErrors)) {
    if (!path.startsWith(prefix)) continue;
    const remainder = path.slice(prefix.length);
    const field = remainder.split(".")[0];
    if (!field) continue;
    const message = messages?.find((value) => value.trim());
    if (message && !errors[field]) {
      errors[field] = message.trim();
    }
  }

  return errors;
}

export function mapAutomationSectionFieldErrorsFromDetails(
  section: keyof PlatformAutomationConfig,
  details: unknown,
): Record<string, string> {
  if (!details || typeof details !== "object") return {};
  const fieldErrors = (details as ZodFlattenShape).fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== "object") return {};
  return mapAutomationSectionFieldErrors(section, { fieldErrors });
}

export function resolveAutomationConfigSaveValidationErrors(
  section: keyof PlatformAutomationConfig,
  details: unknown,
): {
  fieldErrors: Record<string, string>;
  message: string | null;
} {
  const fieldErrors = mapAutomationSectionFieldErrorsFromDetails(section, details);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, message: null };
  }

  return {
    fieldErrors: {},
    message: formatZodFlattenDetails(details),
  };
}
