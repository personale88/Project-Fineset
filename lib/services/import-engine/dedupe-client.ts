import { hashPhone } from "@/lib/crypto/pii";
import { prisma } from "@/lib/db/prisma";
import type { CustomerDedupeClient, CustomerDedupeRecord } from "@/lib/import-engine/types";
import { phoneDigitsForHash } from "@/lib/import-engine/utils/phoneNormaliser";

export function createPrismaDedupeClient(): CustomerDedupeClient {
  return {
    async findByPhoneHashes(phoneHashes: string[], storeId: string): Promise<CustomerDedupeRecord[]> {
      if (phoneHashes.length === 0) return [];
      const customers = await prisma.customer.findMany({
        where: { storeId, phoneHash: { in: phoneHashes } },
        select: { id: true, phoneHash: true },
      });
      return customers.map((customer) => ({
        id: customer.id,
        phoneHash: customer.phoneHash,
      }));
    },
  };
}

export function phoneHashFromRawPhone(phone: string): string {
  return hashPhone(phoneDigitsForHash(phone));
}

export async function loadStaffLookup(storeId: string): Promise<Array<{ display: string; key: string }>> {
  const staff = await prisma.staff.findMany({
    where: { storeId, isActive: true },
    select: { id: true, name: true, employeeId: true },
  });

  const records: Array<{ display: string; key: string }> = [];
  for (const member of staff) {
    records.push({ display: member.name, key: member.id });
    records.push({ display: member.employeeId, key: member.id });
  }
  return records;
}
