import { describe, expect, it } from "vitest";
import { buildWorkQueueResponse } from "./staff-work-queue";
import type { StaffWorkQueueItem } from "@/types/staff-work-queue";

function makeItem(
  reason: StaffWorkQueueItem["reason"],
  index: number,
): StaffWorkQueueItem {
  return {
    id: `${reason}-${index}`,
    priority: 1,
    reason,
    customerName: `Customer ${index}`,
    subtitle: "Preview item",
    storeId: "store-1",
    storeName: "Store Alpha",
    assignedStaffName: "Staff",
    followUp: null,
    call: {
      recordId: `${reason}-${index}`,
      masterSource: "STORE_VISIT",
      visitId: `visit-${index}`,
      fieldSaleId: null,
      followUpId: null,
      staffId: "staff-1",
      staffName: "Staff",
      displayName: `Customer ${index}`,
      visitDate: "2026-06-01",
      visitDateLabel: "1 Jun 2026",
      customerType: "NEW",
      purchaseStatus: "NOT_PURCHASED",
      valueTier: "MID",
      visitSummary: "Preview item",
      queue: "NOT_ANSWERED",
      followUpDueDate: null,
      lastCallStatus: null,
      notes: null,
      canCall: true,
    },
  };
}

describe("buildWorkQueueResponse", () => {
  it("reserves at least one preview item per non-empty category", () => {
    const items = [
      ...Array.from({ length: 50 }, (_, index) => makeItem("due_today_task", index)),
      ...Array.from({ length: 30 }, (_, index) => makeItem("not_answered", index)),
      makeItem("follow_up_call", 0),
    ];

    const response = buildWorkQueueResponse(items, 15);
    const reasons = new Set(response.items.map((item) => item.reason));

    expect(reasons.has("due_today_task")).toBe(true);
    expect(reasons.has("not_answered")).toBe(true);
    expect(reasons.has("follow_up_call")).toBe(true);
    expect(response.items).toHaveLength(15);
    expect(response.categoryTotals.due_today_task).toBe(50);
    expect(response.categoryTotals.not_answered).toBe(30);
  });

  it("includes a preview item for every non-empty category even when limit is small", () => {
    const items = [
      ...Array.from({ length: 10 }, (_, index) => makeItem("overdue_task", index)),
      ...Array.from({ length: 8 }, (_, index) => makeItem("due_today_task", index)),
      ...Array.from({ length: 6 }, (_, index) => makeItem("not_answered", index)),
    ];

    const response = buildWorkQueueResponse(items, 5);
    const previewReasons = new Set(response.items.map((item) => item.reason));

    expect(previewReasons.has("overdue_task")).toBe(true);
    expect(previewReasons.has("due_today_task")).toBe(true);
    expect(previewReasons.has("not_answered")).toBe(true);
  });

  it("still includes due today previews when overdue dominates the queue", () => {
    const items = [
      ...Array.from({ length: 80 }, (_, index) => makeItem("overdue_task", index)),
      ...Array.from({ length: 57 }, (_, index) => makeItem("due_today_task", index)),
    ];

    const response = buildWorkQueueResponse(items, 30);

    expect(response.categoryTotals.due_today_task).toBe(57);
    expect(response.items.some((item) => item.reason === "due_today_task")).toBe(true);
  });
});
