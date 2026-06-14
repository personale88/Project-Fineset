export interface StoreNotificationStaffSummary {
  staffId: string;
  staffName: string;
  overdueFollowUps: number;
  dueTodayFollowUps: number;
  followUpCalls: number;
  notAnsweredCalls: number;
}

export interface StoreNotificationTotals {
  overdueFollowUps: number;
  dueTodayFollowUps: number;
  followUpCalls: number;
  notAnsweredCalls: number;
  birthdays: number;
  anniversaries: number;
}

export interface StoreNotificationSummary {
  storeId: string;
  storeName: string;
  city: string;
  state: string;
  totals: StoreNotificationTotals;
  staff: StoreNotificationStaffSummary[];
}

export function storeNotificationCount(summary: StoreNotificationSummary): number {
  const { totals } = summary;
  return (
    totals.overdueFollowUps +
    totals.dueTodayFollowUps +
    totals.followUpCalls +
    totals.notAnsweredCalls +
    totals.birthdays +
    totals.anniversaries
  );
}
