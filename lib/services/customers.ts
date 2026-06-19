import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { buildCustomerSearchWhere } from "@/lib/services/customer-search";
import { decryptCustomerFields, hashPhone } from "@/lib/services/pii";

export interface CustomerLookupResult {
  id: string;
  name: string;
  phone: string;
  area: string | null;
  address: string | null;
  profession: string | null;
  gender: string | null;
  ageGroup: string | null;
  dateOfBirth: string | null;
  anniversary: string | null;
  visitCount: number;
}

export async function lookupCustomerByPhone(
  storeId: string,
  phone: string,
): Promise<CustomerLookupResult | null> {
  const customer = await prisma.customer.findUnique({
    where: {
      phoneHash_storeId: {
        phoneHash: hashPhone(phone),
        storeId,
      },
    },
    include: {
      _count: { select: { visits: true } },
    },
  });

  if (!customer) return null;

  const decrypted = decryptCustomerFields(customer);

  return {
    id: customer.id,
    name: decrypted.name,
    phone: decrypted.phone,
    area: customer.area,
    address: customer.address,
    profession: customer.profession,
    gender: customer.gender,
    ageGroup: customer.ageGroup,
    dateOfBirth: customer.dateOfBirth?.toISOString() ?? null,
    anniversary: customer.anniversary?.toISOString() ?? null,
    visitCount: customer._count.visits,
  };
}

interface ListCustomersParams {
  storeId?: string;
  staffId?: string;
  page: number;
  pageSize: number;
  search?: string;
}

export async function listCustomers(params: ListCustomersParams) {
  const where: Prisma.CustomerWhereInput = {};

  if (params.storeId) {
    where.storeId = params.storeId;
  }

  if (params.staffId) {
    where.OR = [
      { visits: { some: { staffId: params.staffId } } },
      { fieldSales: { some: { staffId: params.staffId } } },
    ];
  }

  const searchWhere = params.search
    ? buildCustomerSearchWhere(params.search)
    : null;
  const customerWhere: Prisma.CustomerWhereInput = searchWhere
    ? { AND: [where, searchWhere] }
    : where;

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where: customerWhere,
      orderBy: { updatedAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        _count: { select: { visits: true } },
      },
    }),
    prisma.customer.count({ where: customerWhere }),
  ]);

  return {
    data: customers.map((customer) => {
      const decrypted = decryptCustomerFields(customer);
      return {
        id: customer.id,
        name: decrypted.name,
        phone: decrypted.phone,
        area: customer.area,
        address: customer.address,
        profession: customer.profession,
        gender: customer.gender,
        ageGroup: customer.ageGroup,
        dateOfBirth: customer.dateOfBirth?.toISOString() ?? null,
        anniversary: customer.anniversary?.toISOString() ?? null,
        visitCount: customer._count.visits,
        storeId: customer.storeId,
        createdAt: customer.createdAt.toISOString(),
      };
    }),
    total,
  };
}
