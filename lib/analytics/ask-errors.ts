export type AnalyticsAskErrorCode =
  | "OUT_OF_SCOPE"
  | "GEMINI_NOT_CONFIGURED"
  | "GEMINI_PARSE_FAILED"
  | "GEMINI_UNAVAILABLE"
  | "RATE_LIMITED"
  | "PROMPT_TOO_SHORT"
  | "INVALID_REQUEST"
  | "INSUFFICIENT_CREDITS";

export class AnalyticsAskError extends Error {
  readonly code: AnalyticsAskErrorCode;
  readonly statusCode: number;

  constructor(code: AnalyticsAskErrorCode, message: string, statusCode = 400) {
    super(message);
    this.name = "AnalyticsAskError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function isAnalyticsAskError(error: unknown): error is AnalyticsAskError {
  return error instanceof AnalyticsAskError;
}
