import { createHash, randomBytes } from "crypto";

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateSecureToken(): string {
  return randomBytes(32).toString("base64url");
}
