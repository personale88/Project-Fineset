export interface StaffMissedSummary {
  storeId: string;
  storeName: string;
  storeCity: string;
  storeState: string;
  staffId: string;
  staffName: string;
  missedCalls: number;
  missedBirthdays: number;
  missedAnniversaries: number;
}

export function staffMissedTotal(summary: StaffMissedSummary): number {
  return summary.missedCalls + summary.missedBirthdays + summary.missedAnniversaries;
}
