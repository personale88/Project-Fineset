import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseAnalyticsAskIntent } from "@/lib/analytics/ask-intent-parser";
import { ANALYTICS_FILTER_NA } from "@/lib/analytics/analytics-query-filters";
import { buildAggWhere, queryAggregateRows } from "@/lib/analytics/aggregate-queries";
import type { ParsedAnalyticsAskIntent } from "@/lib/validations/admin-business-analytics-ask.schema";
import type { AdminBusinessAnalyticsQuery } from "@/lib/validations/admin-business-analytics.schema";

const mockQueryRawUnsafe = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRawUnsafe: (...args: unknown[]) => mockQueryRawUnsafe(...args),
  },
}));

function baseQuery(overrides?: Partial<AdminBusinessAnalyticsQuery>): AdminBusinessAnalyticsQuery {
  return {
    dateMode: "preset",
    period: "last6months",
    activeFilters: [],
    segment: "ALL",
    valueTier: "ALL",
    ...overrides,
  };
}

/** Mirrors ask route intentToAnalyticsQuery for end-to-end SQL tests. */
function intentToAnalyticsQuery(intent: ParsedAnalyticsAskIntent): AdminBusinessAnalyticsQuery {
  const query: AdminBusinessAnalyticsQuery = {
    dateMode: intent.dateMode,
    activeFilters: intent.activeFilters ?? [],
    segment: intent.segment ?? "ALL",
    valueTier: intent.valueTier ?? "ALL",
  };

  if (intent.dateMode === "preset" && !intent.rollingMonths && !intent.rollingDays) {
    query.period = intent.period ?? "last30days";
  } else if (intent.period) {
    query.period = intent.period;
  }
  if (intent.month) query.month = intent.month;
  if (intent.year) query.year = intent.year;
  if (intent.compareAMonth) query.compareAMonth = intent.compareAMonth;
  if (intent.compareAYear) query.compareAYear = intent.compareAYear;
  if (intent.compareBMonth) query.compareBMonth = intent.compareBMonth;
  if (intent.compareBYear) query.compareBYear = intent.compareBYear;
  if (intent.customerType) query.customerType = intent.customerType;
  if (intent.productCategory) query.productCategory = intent.productCategory;
  if (intent.area) query.area = intent.area;
  if (intent.rollingMonths) query.rollingMonths = intent.rollingMonths;
  if (intent.rollingDays) query.rollingDays = intent.rollingDays;

  return query;
}

const start = new Date("2026-01-01T00:00:00Z");
const end = new Date("2026-06-30T23:59:59Z");

/** Old bug: enum column compared to text bind without :: cast. */
const UNCAST_ENUM_PATTERN =
  /(customer_type|purchase_status|source_channel|intent_tier|budget_stated) = \$\d+(?!::)/;

function expectNoUncastEnumCompare(sql: string): void {
  expect(sql).not.toMatch(UNCAST_ENUM_PATTERN);
}

function expectDateRangeParams(params: unknown[]): void {
  expect(params[0]).toEqual(start);
  expect(params[1]).toEqual(end);
}

describe("buildAggWhere — CustomerType", () => {
  it.each(["NEW", "REPEAT", "VIP"] as const)("casts customerType=%s", (customerType) => {
    const { sql, params } = buildAggWhere(
      baseQuery({ activeFilters: ["customerType"], customerType }),
      start,
      end,
    );
    expect(sql).toContain('customer_type = $3::"CustomerType"');
    expect(params[2]).toBe(customerType);
    expectNoUncastEnumCompare(sql);
  });
});

describe("buildAggWhere — segment", () => {
  it("casts segment NEW", () => {
    const { sql, params } = buildAggWhere(
      baseQuery({ activeFilters: ["segment"], segment: "NEW" }),
      start,
      end,
    );
    expect(sql).toContain('customer_type = $3::"CustomerType"');
    expect(params[2]).toBe("NEW");
    expectNoUncastEnumCompare(sql);
  });

  it("uses typed IN for segment RETAINED", () => {
    const { sql, params } = buildAggWhere(
      baseQuery({ activeFilters: ["segment"], segment: "RETAINED" }),
      start,
      end,
    );
    expect(sql).toContain(
      `customer_type IN ('REPEAT'::"CustomerType", 'VIP'::"CustomerType")`,
    );
    expect(params).toHaveLength(2);
    expectNoUncastEnumCompare(sql);
  });

  it("casts segment PURCHASED", () => {
    const { sql, params } = buildAggWhere(
      baseQuery({ activeFilters: ["segment"], segment: "PURCHASED" }),
      start,
      end,
    );
    expect(sql).toContain('purchase_status = $3::"PurchaseStatus"');
    expect(params[2]).toBe("PURCHASED");
    expectNoUncastEnumCompare(sql);
  });

  it("casts segment NOT_PURCHASED", () => {
    const { sql, params } = buildAggWhere(
      baseQuery({ activeFilters: ["segment"], segment: "NOT_PURCHASED" }),
      start,
      end,
    );
    expect(sql).toContain('purchase_status = $3::"PurchaseStatus"');
    expect(params[2]).toBe("NOT_PURCHASED");
    expectNoUncastEnumCompare(sql);
  });

  it("ignores segment ALL", () => {
    const { sql } = buildAggWhere(
      baseQuery({ activeFilters: ["segment"], segment: "ALL" }),
      start,
      end,
    );
    expect(sql).toBe("date >= $1 AND date <= $2");
  });
});

describe("buildAggWhere — PurchaseStatus", () => {
  it.each(["PURCHASED", "NOT_PURCHASED", "PENDING"] as const)("casts purchaseStatus=%s", (purchaseStatus) => {
    const { sql, params } = buildAggWhere(
      baseQuery({ activeFilters: ["purchaseStatus"], purchaseStatus }),
      start,
      end,
    );
    expect(sql).toContain('purchase_status = $3::"PurchaseStatus"');
    expect(params[2]).toBe(purchaseStatus);
    expectNoUncastEnumCompare(sql);
  });
});

describe("buildAggWhere — SourceChannel", () => {
  it.each([
    "ORGANIC_WALK_IN",
    "REFERRAL",
    "SOCIAL_MEDIA",
    "INTERNET",
    "PHONE",
    "USER_CALLS",
    "TANISHQ_REF",
    "CARATLANE_REF",
    "OTHER",
  ] as const)("casts sourceChannel=%s", (sourceChannel) => {
    const { sql, params } = buildAggWhere(
      baseQuery({ activeFilters: ["sourceChannel"], sourceChannel }),
      start,
      end,
    );
    expect(sql).toContain('source_channel = $3::"SourceChannel"');
    expect(params[2]).toBe(sourceChannel);
    expectNoUncastEnumCompare(sql);
  });
});

describe("buildAggWhere — IntentTier", () => {
  it.each(["HOT", "WARM", "COLD", "BROWSING"] as const)("casts intentTier=%s", (intentTier) => {
    const { sql, params } = buildAggWhere(
      baseQuery({ activeFilters: ["intentTier"], intentTier }),
      start,
      end,
    );
    expect(sql).toContain('intent_tier = $3::"IntentTier"');
    expect(params[2]).toBe(intentTier);
    expectNoUncastEnumCompare(sql);
  });

  it("uses IS NULL for intentTier NA (no enum bind)", () => {
    const { sql, params } = buildAggWhere(
      baseQuery({ activeFilters: ["intentTier"], intentTier: ANALYTICS_FILTER_NA }),
      start,
      end,
    );
    expect(sql).toContain("intent_tier IS NULL");
    expect(sql).not.toContain("IntentTier");
    expect(params).toHaveLength(2);
  });
});

describe("buildAggWhere — BudgetRange", () => {
  it.each([
    "UNDER_15K",
    "K15_50K",
    "K50_1L",
    "ABOVE_1L",
    "NOT_STATED",
  ] as const)("casts budgetRange=%s", (budgetRange) => {
    const { sql, params } = buildAggWhere(
      baseQuery({ activeFilters: ["budgetRange"], budgetRange }),
      start,
      end,
    );
    expect(sql).toContain('budget_stated = $3::"BudgetRange"');
    expect(params[2]).toBe(budgetRange);
    expectNoUncastEnumCompare(sql);
  });

  it("uses IS NULL for budgetRange NA", () => {
    const { sql, params } = buildAggWhere(
      baseQuery({ activeFilters: ["budgetRange"], budgetRange: ANALYTICS_FILTER_NA }),
      start,
      end,
    );
    expect(sql).toContain("budget_stated IS NULL");
    expect(params).toHaveLength(2);
  });
});

describe("buildAggWhere — staffId and inactive filters", () => {
  it("binds staffId as text (non-enum)", () => {
    const { sql, params } = buildAggWhere(
      baseQuery({ activeFilters: ["staffId"], staffId: "staff-abc" }),
      start,
      end,
    );
    expect(sql).toContain("staff_id = $3");
    expect(sql).not.toContain("staff_id = $3::");
    expect(params[2]).toBe("staff-abc");
  });

  it("does not add filters when activeFilters is empty", () => {
    const { sql, params } = buildAggWhere(
      baseQuery({
        customerType: "VIP",
        segment: "NEW",
        purchaseStatus: "PURCHASED",
      }),
      start,
      end,
    );
    expect(sql).toBe("date >= $1 AND date <= $2");
    expect(params).toHaveLength(2);
  });
});

describe("buildAggWhere — combined filters (parameter index order)", () => {
  it("increments bind indices for multiple enum filters", () => {
    const { sql, params } = buildAggWhere(
      baseQuery({
        activeFilters: ["customerType", "sourceChannel", "staffId"],
        customerType: "REPEAT",
        sourceChannel: "REFERRAL",
        staffId: "staff-1",
      }),
      start,
      end,
    );

    expect(sql).toContain('customer_type = $3::"CustomerType"');
    expect(sql).toContain('source_channel = $4::"SourceChannel"');
    expect(sql).toContain("staff_id = $5");
    expect(params).toEqual([start, end, "REPEAT", "REFERRAL", "staff-1"]);
    expectNoUncastEnumCompare(sql);
  });

  it("handles segment NEW with purchaseStatus filter", () => {
    const { sql, params } = buildAggWhere(
      baseQuery({
        activeFilters: ["segment", "purchaseStatus"],
        segment: "NEW",
        purchaseStatus: "PURCHASED",
      }),
      start,
      end,
    );

    expect(sql).toContain('purchase_status = $3::"PurchaseStatus"');
    expect(sql).toContain('customer_type = $4::"CustomerType"');
    expect(params[2]).toBe("PURCHASED");
    expect(params[3]).toBe("NEW");
    expectNoUncastEnumCompare(sql);
  });
});

describe("Ask prompt → buildAggWhere (staging failure scenarios)", () => {
  const ASK_SQL_MATRIX: Array<{
    id: string;
    prompt: string;
    assert: (sql: string, params: unknown[]) => void;
  }> = [
    {
      id: "ASK-01",
      prompt: "new customers last 6 months visits",
      assert: (sql, params) => {
        expect(sql).toContain('customer_type = $3::"CustomerType"');
        expect(params[2]).toBe("NEW");
      },
    },
    {
      id: "ASK-02",
      prompt: "vip visits last 6 months",
      assert: (sql, params) => {
        expect(sql).toContain('customer_type = $3::"CustomerType"');
        expect(params[2]).toBe("VIP");
      },
    },
    {
      id: "ASK-03",
      prompt: "repeat customers revenue last 6 months",
      assert: (sql, params) => {
        expect(sql).toContain('customer_type = $3::"CustomerType"');
        expect(params[2]).toBe("REPEAT");
      },
    },
    {
      id: "ASK-04",
      prompt: "retained customers last 6 months",
      assert: (sql) => {
        expect(sql).toContain(
          `customer_type IN ('REPEAT'::"CustomerType", 'VIP'::"CustomerType")`,
        );
      },
    },
    {
      id: "ASK-05",
      prompt: "purchased customers last 6 months",
      assert: (sql) => {
        expect(sql).toContain('purchase_status = $3::"PurchaseStatus"');
      },
    },
    {
      id: "ASK-06",
      prompt: "not purchased customers last 6 months",
      assert: (sql) => {
        expect(sql).toContain('purchase_status = $3::"PurchaseStatus"');
      },
    },
    {
      id: "ASK-07",
      prompt: "Compare may 2026 vs march 2026 visits by customer type",
      assert: (sql) => {
        // Compare sets breakdownDimension only — no enum filter unless parsed
        expect(sql).toBe("date >= $1 AND date <= $2");
      },
    },
    {
      id: "ASK-08",
      prompt: "high value new customers last 6 months",
      assert: (sql, params) => {
        expect(sql).toContain('customer_type = $3::"CustomerType"');
        expect(params[2]).toBe("NEW");
      },
    },
    {
      id: "ASK-09",
      prompt: "last 6 months visits by customer type",
      assert: (sql) => {
        // breakdown only — must not crash with enum mismatch
        expect(sql).toBe("date >= $1 AND date <= $2");
      },
    },
    {
      id: "ASK-10",
      prompt: "hot intent visits last 6 months",
      assert: (sql) => {
        // Parser sets breakdownDimension=intentTier but does not add SQL filter
        expect(sql).toBe("date >= $1 AND date <= $2");
      },
    },
  ];

  for (const row of ASK_SQL_MATRIX) {
    it(`${row.id}: ${row.prompt}`, () => {
      const intent = parseAnalyticsAskIntent(row.prompt);
      const query = intentToAnalyticsQuery(intent);
      const { sql, params } = buildAggWhere(query, start, end);
      row.assert(sql, params);
      expectNoUncastEnumCompare(sql);
      expectDateRangeParams(params);
    });
  }
});

describe("queryAggregateRows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryRawUnsafe.mockResolvedValue([]);
  });

  it("baseline query without enum filters", async () => {
    await queryAggregateRows(baseQuery(), start, end);
    const [sql, ...params] = mockQueryRawUnsafe.mock.calls[0] as [string, ...unknown[]];
    expect(sql).toContain("visit_daily_aggregate");
    expect(sql).not.toMatch(UNCAST_ENUM_PATTERN);
    expect(params).toHaveLength(2);
  });

  it.each([
    { label: "segment NEW", query: baseQuery({ activeFilters: ["segment"], segment: "NEW" }) },
    {
      label: "customerType VIP",
      query: baseQuery({ activeFilters: ["customerType"], customerType: "VIP" }),
    },
    {
      label: "segment NOT_PURCHASED",
      query: baseQuery({ activeFilters: ["segment"], segment: "NOT_PURCHASED" }),
    },
    {
      label: "sourceChannel REFERRAL",
      query: baseQuery({ activeFilters: ["sourceChannel"], sourceChannel: "REFERRAL" }),
    },
    {
      label: "intentTier NA",
      query: baseQuery({ activeFilters: ["intentTier"], intentTier: ANALYTICS_FILTER_NA }),
    },
    {
      label: "store + segment NEW",
      query: baseQuery({
        activeFilters: ["segment", "storeId"],
        segment: "NEW",
        storeId: "cmqyxz24n0000tvscjslfm0sc",
      }),
    },
  ])("executes SQL with enum casts for $label", async ({ query }) => {
    await queryAggregateRows(query, start, end);
    expect(mockQueryRawUnsafe).toHaveBeenCalledTimes(1);
    const [sql] = mockQueryRawUnsafe.mock.calls[0] as [string, ...unknown[]];
    expect(sql).toContain("visit_daily_aggregate");
    expect(sql).not.toMatch(UNCAST_ENUM_PATTERN);
  });

  it("passes store scope in SQL for Vignesh store", async () => {
    await queryAggregateRows(
      baseQuery({
        activeFilters: ["storeId"],
        storeId: "cmqyxz24n0000tvscjslfm0sc",
      }),
      start,
      end,
    );
    const [sql] = mockQueryRawUnsafe.mock.calls[0] as [string, ...unknown[]];
    expect(sql).toContain("cmqyxz24n0000tvscjslfm0sc");
  });
});
