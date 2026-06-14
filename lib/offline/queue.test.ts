import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  enqueueOfflineMutation,
  listOfflineMutations,
  removeOfflineMutation,
} from "@/lib/offline/queue";

const store = new Map<string, unknown>();

function createRequest<T>(result: T) {
  const request = {
    result,
    onsuccess: null as ((event: Event) => void) | null,
    onerror: null as ((event: Event) => void) | null,
  };
  queueMicrotask(() => {
    request.onsuccess?.({ target: request } as unknown as Event);
  });
  return request;
}

vi.stubGlobal("indexedDB", {
  open: () => {
    const db = {
      objectStoreNames: { contains: () => true },
      createObjectStore: () => undefined,
      transaction: () => ({
        objectStore: () => ({
          put: (value: { id: string }) => {
            store.set(value.id, value);
            return createRequest(value.id);
          },
          getAll: () => createRequest(Array.from(store.values())),
          delete: (id: string) => {
            store.delete(id);
            return createRequest(undefined);
          },
        }),
      }),
    };

    const openRequest = {
      result: db,
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
      onupgradeneeded: null as ((event: Event) => void) | null,
    };

    queueMicrotask(() => {
      openRequest.onsuccess?.({ target: openRequest } as unknown as Event);
    });

    return openRequest;
  },
});

describe("offline queue", () => {
  beforeEach(() => {
    store.clear();
  });

  it("enqueues and lists mutations", async () => {
    const id = await enqueueOfflineMutation({
      kind: "visit",
      url: "/api/visits",
      method: "POST",
      body: "{}",
    });
    expect(id).toBeTruthy();
    const items = await listOfflineMutations();
    expect(items).toHaveLength(1);
    await removeOfflineMutation(id);
    expect(await listOfflineMutations()).toHaveLength(0);
  });
});
