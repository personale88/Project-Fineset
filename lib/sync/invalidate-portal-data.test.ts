import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { invalidateEntity } from "@/lib/sync/invalidate-portal-data";
import { createDebouncedBatch } from "@/lib/sync/debounced-batch";
import { SSE_INVALIDATION_DEBOUNCE_MS } from "@/lib/sync/constants";

describe("invalidateEntity", () => {
  it("invalidates analytics when visits change", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await invalidateEntity(queryClient, "visits");

    const keys = invalidateSpy.mock.calls.map((call) => call[0]?.queryKey);
    expect(keys).toContainEqual(["visits"]);
    expect(keys).toContainEqual(["analytics"]);
  });

  it("invalidates analytics for stores entity", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await invalidateEntity(queryClient, "stores");

    const keys = invalidateSpy.mock.calls.map((call) => call[0]?.queryKey);
    expect(keys).toContainEqual(["stores"]);
    expect(keys).toContainEqual(["analytics"]);
  });
});

describe("createDebouncedBatch", () => {
  it("coalesces rapid additions into one flush", () => {
    vi.useFakeTimers();
    const flushed: string[][] = [];

    const batch = createDebouncedBatch<string>({
      debounceMs: SSE_INVALIDATION_DEBOUNCE_MS,
      onFlush: (items) => flushed.push(items),
    });

    batch.add("visits");
    batch.add("staff");
    batch.add("visits");

    expect(flushed).toHaveLength(0);
    vi.advanceTimersByTime(SSE_INVALIDATION_DEBOUNCE_MS - 1);
    expect(flushed).toHaveLength(0);

    vi.advanceTimersByTime(1);
    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toEqual(expect.arrayContaining(["visits", "staff"]));
    expect(flushed[0]).toHaveLength(2);

    vi.useRealTimers();
  });
});
