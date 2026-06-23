const TIME_INPUT_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeInput(value: string): boolean {
  return TIME_INPUT_RE.test(value);
}

export function formatTimeForInput(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function parseTimeInput(time: string, baseDate: Date = new Date()): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}
