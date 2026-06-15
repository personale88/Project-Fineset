import { describe, expect, it, vi } from "vitest";
import { exportVisitsCsv } from "./visit-export";
import type { VisitListItem } from "@/types";

vi.mock("@/components/shared/ExportButton", () => ({
  downloadCsv: vi.fn(),
}));

import { downloadCsv } from "@/components/shared/ExportButton";

const copy = {
  columns: {
    id: "ID",
    visitDate: "Visit Date",
    inTime: "In",
    outTime: "Out",
    duration: "Duration",
    staff: "Staff",
    customer: "Customer",
    phone: "Phone",
    customerType: "Type",
    visitType: "Visit Type",
    source: "Source",
    area: "Area",
    gender: "Gender",
    ageGroup: "Age",
    purchaseStatus: "Purchase",
    explored: "Explored",
    purchased: "Purchased",
    amount: "Amount",
    intent: "Intent",
    reason: "Reason",
    competitor: "Competitor",
    occasion: "Occasion",
    metal: "Metal",
    budget: "Budget",
    scheme: "Scheme",
    ghs: "GHS",
    followUpNeeded: "Follow-up",
    followUpDate: "Follow-up Date",
    followUpStatus: "Follow-up Status",
    notes: "Notes",
  },
} as const;

const fieldLabels = {
  customerType: { options: { NEW: "New", RETAINED: "Retained" } },
  visitType: { options: { WALK_IN: "Walk-in" } },
  sourceChannel: { options: { STORE: "Store" } },
  gender: { options: { MALE: "Male" } },
  ageGroup: { options: { ADULT: "Adult" } },
  purchaseStatus: { options: { PURCHASED: "Purchased" } },
  intentTier: { options: { HIGH: "High" } },
  reasonNoPurchase: { options: {} },
  purchaseOccasion: { options: {} },
  metalKtPref: { options: {} },
  budgetStated: { options: {} },
} as const;

const visit = {
  id: "visit-1",
  customerId: "cust-1",
  visitDate: "2026-05-01T10:00:00.000Z",
  inTime: null,
  outTime: null,
  durationMins: null,
  staffId: "staff-1",
  staffName: "Alex",
  customerName: "Jane Doe",
  customerPhone: "9876543210",
  customerType: "NEW",
  visitType: "WALK_IN",
  sourceChannel: "ORGANIC_WALK_IN",
  area: "Downtown",
  address: "12 Main St",
  profession: "Engineer",
  gender: "MALE",
  ageGroup: "ADULT",
  dateOfBirth: "1990-01-15T00:00:00.000Z",
  anniversary: "2015-06-20T00:00:00.000Z",
  purchaseStatus: "PURCHASED",
  productsExplored: ["FINGER_RINGS"],
  productsPurchased: ["FINGER_RINGS"],
  transactionAmount: 50000,
  intentTier: "HOT",
  reasonNoPurchase: null,
  competitorMention: null,
  purchaseOccasion: null,
  metalKtPref: null,
  budgetStated: null,
  schemeEnrolled: false,
  ghsPolicy: false,
  followUpNeeded: false,
  followUpDate: null,
  followUpStatus: null,
  staffNotes: "Great visit",
} satisfies VisitListItem;

describe("exportVisitsCsv", () => {
  it("downloads a CSV with masked phone and formatted values", () => {
    exportVisitsCsv({
      copy: copy as never,
      data: [visit],
      fieldLabels: fieldLabels as never,
      productLabels: { FINGER_RINGS: "Finger rings" },
      yesLabel: "Yes",
      noLabel: "No",
    });

    const rows = vi.mocked(downloadCsv).mock.calls[0]?.[2] as string[][];
    expect(rows[0]).toContain("visit-1");
    expect(rows[0]).toContain("Alex");
    expect(rows[0]).toContain("Jane Doe");
    expect(rows[0]).toContain("98****3210");
  });
});
