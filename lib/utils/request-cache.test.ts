import { afterEach, describe, expect, it, vi } from "vitest";
import { requestCache } from "@/lib/utils/request-cache";

describe("requestCache", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the same function when React cache is unavailable", () => {
    vi.doMock("react", () => ({ cache: undefined }));
    const fn = vi.fn(() => "ok");
    const wrapped = requestCache(fn);
    expect(wrapped).toBe(fn);
    expect(wrapped()).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
