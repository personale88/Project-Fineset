export function generateCustomerId(): string {
  return crypto.randomUUID();
}
