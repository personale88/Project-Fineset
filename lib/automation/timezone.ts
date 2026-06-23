export function getDayOfMonthInTimezone(timezone: string, reference = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      day: "numeric",
    }).format(reference),
  );
}

export function getHourInTimezone(timezone: string, reference = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(reference),
  );
}

export function getMonthYearInTimezone(
  timezone: string,
  reference = new Date(),
): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(reference);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "1970");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "1");
  return { year, month };
}

export function billingCycleMonthKeyInTimezone(
  timezone: string,
  reference = new Date(),
): string {
  const { year, month } = getMonthYearInTimezone(timezone, reference);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shouldRunOnDayInTimezone(
  dayOfMonth: number,
  timezone: string,
  reference = new Date(),
): boolean {
  return getDayOfMonthInTimezone(timezone, reference) === dayOfMonth;
}

export function shouldRunAtHourInTimezone(
  hourLocal: number,
  timezone: string,
  reference = new Date(),
): boolean {
  return getHourInTimezone(timezone, reference) === hourLocal;
}

export function isWithinBusinessHoursInTimezone(
  timezone: string,
  startTime: string,
  endTime: string,
  reference = new Date(),
): boolean {
  const hour = getHourInTimezone(timezone, reference);
  const minute = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      minute: "numeric",
    }).format(reference),
  );
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const minutes = hour * 60 + minute;
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;
  return minutes >= start && minutes <= end;
}
