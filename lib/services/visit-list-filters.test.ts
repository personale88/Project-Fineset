import { describe, expect, it } from "vitest";
import { callOnlyVisitShellExclusion } from "@/lib/services/visit-list-filters";

describe("callOnlyVisitShellExclusion", () => {
  it("excludes USER_CALLS source channel shells", () => {
    expect(callOnlyVisitShellExclusion()).toEqual({
      NOT: {
        OR: [
          { sourceChannel: "USER_CALLS" },
          {
            AND: [
              { sourceChannel: "PHONE" },
              { inTime: null },
              { outTime: null },
              { productsExplored: { isEmpty: true } },
              { productsPurchased: { isEmpty: true } },
              { callLogs: { some: {} } },
            ],
          },
        ],
      },
    });
  });
});
