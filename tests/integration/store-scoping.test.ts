import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resolveAccessibleStoreId } from "@/lib/services/manager-stores";
import type { BusinessOwnerSession, StoreSession } from "@/types";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("store scoping integration", () => {
  let primaryStoreId: string;
  let secondaryStoreId: string;
  const ownerEmail = `owner-scope-${Date.now()}@test.local`;

  beforeAll(async () => {
    const primary = await prisma.store.create({
      data: {
        name: "Primary Store",
        city: "Delhi",
        state: "DL",
        businessOwnerEmail: ownerEmail,
      },
    });
    primaryStoreId = primary.id;

    const secondary = await prisma.store.create({
      data: {
        name: "Secondary Store",
        city: "Pune",
        state: "MH",
        businessOwnerEmail: ownerEmail,
      },
    });
    secondaryStoreId = secondary.id;
  }, 60_000);

  afterAll(async () => {
    await prisma.store.deleteMany({
      where: { id: { in: [primaryStoreId, secondaryStoreId] } },
    });
    await prisma.$disconnect();
  });

  it("resolves requested store for multi-store business owner", async () => {
    const session: BusinessOwnerSession = {
      role: "BUSINESS_OWNER",
      userId: "owner-scope",
      email: ownerEmail,
      storeId: primaryStoreId,
      storeName: "Primary Store",
    };

    await expect(resolveAccessibleStoreId(session, secondaryStoreId)).resolves.toBe(
      secondaryStoreId,
    );
  });

  it("EC-BE-061: rejects store not linked to owner email with STORE_ACCESS_DENIED", async () => {
    const session: BusinessOwnerSession = {
      role: "BUSINESS_OWNER",
      userId: "owner-scope",
      email: ownerEmail,
      storeId: primaryStoreId,
      storeName: "Primary Store",
    };

    await expect(
      resolveAccessibleStoreId(session, "clnonexistentstore000000000"),
    ).rejects.toThrow("STORE_ACCESS_DENIED");
  });

  it("EC-BE-062: blocks store manager cross-store access at service layer", async () => {
    const session: StoreSession = {
      role: "STORE_MANAGER",
      userId: "mgr-scope",
      email: "manager-scope@test.local",
      storeId: primaryStoreId,
      storeName: "Primary Store",
    };

    await expect(
      resolveAccessibleStoreId(session, secondaryStoreId),
    ).rejects.toThrow("STORE_ACCESS_DENIED");
  });
});
