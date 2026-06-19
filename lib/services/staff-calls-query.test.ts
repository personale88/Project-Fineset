import { describe, expect, it } from "vitest";
import {
  buildFieldSaleAnniversaryWhere,
  buildFieldSaleBirthdayWhere,
  buildFieldSaleValueTierWhere,
  buildVisitAnniversaryWhere,
  buildVisitBirthdayWhere,
  buildVisitListWhere,
  buildVisitValueTierWhere,
} from "@/lib/services/staff-calls-query";

const baseParams = {
  staffId: "staff-1",
  storeId: "store-1",
  master: "ALL" as const,
  segment: "ALL" as const,
  valueTier: "ALL" as const,
  queue: "ALL" as const,
  birthday: "ALL" as const,
  anniversary: "ALL" as const,
  year: 2026,
  month: 6,
};

describe("staff-calls-query", () => {
  it("adds value tier filter to visit where", () => {
    expect(buildVisitValueTierWhere("HIGH")).toEqual({ callValueTier: "HIGH" });
    expect(buildVisitValueTierWhere("ALL")).toEqual({});
  });

  it("adds birthday month filter when THIS_MONTH", () => {
    expect(buildVisitBirthdayWhere("THIS_MONTH", 6)).toEqual({ birthMonth: 6 });
    expect(buildVisitBirthdayWhere("ALL", 6)).toEqual({});
  });

  it("adds anniversary month filter when THIS_MONTH", () => {
    expect(buildFieldSaleAnniversaryWhere("THIS_MONTH", 8)).toEqual({
      anniversaryMonth: 8,
    });
    expect(buildFieldSaleAnniversaryWhere("ALL", 8)).toEqual({});
  });

  it("composes denorm filters into visit list where", () => {
    const where = buildVisitListWhere({
      ...baseParams,
      valueTier: "MID",
      birthday: "ALL",
      anniversary: "ALL",
    });

    expect(where.callValueTier).toBe("MID");
    expect(where.birthMonth).toBeUndefined();
    expect(where.anniversaryMonth).toBeUndefined();
    expect(where.staffId).toBe("staff-1");
    expect(where.visitDate).toBeDefined();
  });

  it("drops visit month filter for birthday occasion lists", () => {
    const where = buildVisitListWhere({
      ...baseParams,
      birthday: "THIS_MONTH",
    });

    expect(where.birthMonth).toBe(6);
    expect(where.visitDate).toBeUndefined();
  });

  it("composes field sale value tier where", () => {
    expect(buildFieldSaleValueTierWhere("LOW")).toEqual({ callValueTier: "LOW" });
    expect(buildFieldSaleBirthdayWhere("THIS_MONTH", 3)).toEqual({ birthMonth: 3 });
  });
});
