export function earliestDate(dates: Array<Date | string | null | undefined>): Date | null {
  const timestamps = dates
    .filter((value): value is Date | string => value != null)
    .map((value) => new Date(value).getTime())
    .filter((time) => !Number.isNaN(time));

  if (timestamps.length === 0) return null;
  return new Date(Math.min(...timestamps));
}

export function latestDate(dates: Array<Date | string | null | undefined>): Date | null {
  const timestamps = dates
    .filter((value): value is Date | string => value != null)
    .map((value) => new Date(value).getTime())
    .filter((time) => !Number.isNaN(time));

  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps));
}
