import { describe, expect, it } from "vitest";
import { ApiError } from "@/types";
import {
  isAutomationConfigLoadFailure,
  shouldPersistAutomationConfigLoadFailure,
} from "@/lib/automation/config-load-failure";

describe("isAutomationConfigLoadFailure", () => {
  it("detects initial and refetch config load failures", () => {
    expect(
      isAutomationConfigLoadFailure({
        error: new Error("Network error"),
        status: "error",
      }),
    ).toBe(true);
    expect(
      isAutomationConfigLoadFailure({
        error: new Error("Network error"),
        status: "success",
        isRefetchError: true,
      }),
    ).toBe(true);
  });

  it("ignores unauthorized errors and successful loads", () => {
    expect(
      isAutomationConfigLoadFailure({
        error: new ApiError(401, { message: "Unauthorized" }),
        status: "error",
      }),
    ).toBe(false);
    expect(
      isAutomationConfigLoadFailure({
        error: null,
        status: "success",
      }),
    ).toBe(false);
  });
});

describe("shouldPersistAutomationConfigLoadFailure", () => {
  it("keeps the banner visible while a sticky failure is active", () => {
    expect(
      shouldPersistAutomationConfigLoadFailure({
        liveFailure: false,
        stickyFailure: true,
      }),
    ).toBe(true);
  });
});
