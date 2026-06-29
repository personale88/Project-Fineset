import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURES_PATH = resolve(__dirname, "../.auth-fixtures.json");

export function devPortalUsersReady(): boolean {
  try {
    const raw = readFileSync(FIXTURES_PATH, "utf8");
    const fixtures = JSON.parse(raw) as { devPortalUsersReady?: boolean };
    return fixtures.devPortalUsersReady === true;
  } catch {
    return false;
  }
}
