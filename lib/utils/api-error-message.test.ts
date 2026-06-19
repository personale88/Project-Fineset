import { describe, expect, it } from "vitest";
import { content } from "@/content/en";
import { ApiError } from "@/types";
import { formatZodFlattenDetails, getPortalErrorMessage } from "@/lib/utils/api-error-message";

const errorsCopy = content.errors;

describe("formatZodFlattenDetails", () => {
  it("returns the first form error", () => {
    expect(
      formatZodFlattenDetails({
        formErrors: ["Purchase status is required"],
        fieldErrors: {},
      }),
    ).toBe("Purchase status is required");
  });

  it("returns the first field error when form errors are empty", () => {
    expect(
      formatZodFlattenDetails({
        formErrors: [],
        fieldErrors: {
          transactionAmount: ["Transaction amount is required for purchases"],
        },
      }),
    ).toBe("Transaction amount is required for purchases");
  });

  it("returns null for invalid payloads", () => {
    expect(formatZodFlattenDetails(null)).toBeNull();
    expect(formatZodFlattenDetails("bad")).toBeNull();
  });
});

describe("getPortalErrorMessage", () => {
  it("returns a specific API message", () => {
    const error = new ApiError(404, { message: "Call record not found" });
    expect(getPortalErrorMessage(error, errorsCopy)).toBe("Call record not found");
  });

  it("returns the first Zod validation message for 400 responses", () => {
    const error = new ApiError(400, {
      message: "Validation failed",
      details: {
        formErrors: [],
        fieldErrors: {
          feedback: ["Feedback is required when the call is answered"],
        },
      },
    });
    expect(getPortalErrorMessage(error, errorsCopy)).toBe(
      "Feedback is required when the call is answered",
    );
  });

  it("includes server detail for 500 responses", () => {
    const error = new ApiError(500, {
      message: "Internal server error",
      detail: "Purchase status is required",
    });
    expect(getPortalErrorMessage(error, errorsCopy)).toBe(
      "Internal server error Purchase status is required",
    );
  });

  it("detects network failures", () => {
    expect(getPortalErrorMessage(new TypeError("Failed to fetch"), errorsCopy)).toBe(
      "Cannot reach the server. Check your internet connection and try again.",
    );
  });

  it("falls back to generic copy", () => {
    expect(getPortalErrorMessage(new Error(""), errorsCopy)).toBe(errorsCopy.generic);
  });

  it("uses unauthorized copy for 401 without a specific message", () => {
    const error = new ApiError(401, { message: "Request failed" });
    expect(getPortalErrorMessage(error, errorsCopy)).toBe(errorsCopy.unauthorized);
  });

  it("uses rateLimited copy for 429 without a specific message", () => {
    const error = new ApiError(429, { message: "Request failed" });
    expect(getPortalErrorMessage(error, errorsCopy)).toBe(errorsCopy.rateLimited);
  });
});
