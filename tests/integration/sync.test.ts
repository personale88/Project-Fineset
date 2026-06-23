import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { computeSyncVersion } from "@/lib/sync/version";

describe.skipIf(!process.env.DATABASE_URL)("sync version with database", () => {
  it("builds a version string for admin scope", async () => {
    await prisma.$connect();
    const payload = await computeSyncVersion(
      {
        role: "MASTER_ADMIN",
        userId: "test-admin",
        email: "admin@test.local",
        permissions: {
          portfolio: true,
          accounts: true,
          analytics: true,
          billing: true,
        },
      },
      ["stores"],
    );
    expect(payload.scope).toBe("all");
    expect(payload.version).toContain("all");
  });
});
