import { prisma } from "@/lib/db/prisma";
import { logAuthEvent } from "@/lib/auth/audit";
import { decryptCustomerFields, prepareCustomerPii } from "@/lib/services/pii";

export async function updateCustomerProfile(
  customerId: string,
  storeId: string,
  input: {
    name?: string;
    phone?: string;
    area?: string | null;
    address?: string | null;
    marketingOptIn?: boolean;
  },
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, storeId },
  });
  if (!customer) return null;

  const data: Record<string, unknown> = {};
  if (input.area !== undefined) data.area = input.area;
  if (input.address !== undefined) data.address = input.address;
  if (input.marketingOptIn !== undefined) data.marketingOptIn = input.marketingOptIn;

  if (input.name || input.phone) {
    const decrypted = decryptCustomerFields(customer);
    const pii = prepareCustomerPii(
      input.name ?? decrypted.name,
      input.phone ?? decrypted.phone,
    );
    Object.assign(data, {
      name: pii.name,
      phone: pii.phone,
      phoneHash: pii.phoneHash,
      nameSearch: pii.nameSearch,
      phoneLast4: pii.phoneLast4,
    });
  }

  return prisma.customer.update({
    where: { id: customerId },
    data,
  });
}

export async function mergeCustomers(params: {
  storeId: string;
  sourceCustomerId: string;
  targetCustomerId: string;
  actorEmail: string;
}) {
  const { storeId, sourceCustomerId, targetCustomerId, actorEmail } = params;
  if (sourceCustomerId === targetCustomerId) {
    throw new Error("Cannot merge a customer into itself");
  }

  await prisma.$transaction(async (tx) => {
    await tx.visit.updateMany({
      where: { customerId: sourceCustomerId, storeId },
      data: { customerId: targetCustomerId },
    });
    await tx.fieldSale.updateMany({
      where: { customerId: sourceCustomerId, storeId },
      data: { customerId: targetCustomerId },
    });
    await tx.customer.delete({ where: { id: sourceCustomerId } });
  });

  void logAuthEvent({
    event: "CUSTOMER_MERGED",
    email: actorEmail,
    metadata: { storeId, sourceCustomerId, targetCustomerId },
  });

  return { targetCustomerId };
}
