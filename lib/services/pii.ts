import {
  decryptPii,
  encryptPii,
  hashPhone,
} from "@/lib/crypto/pii";
import { isProduction } from "@/lib/env";
import { buildCustomerSearchFields } from "@/lib/services/customer-search";

const ENC_PREFIX = "enc:";

const DEV_SAMPLE_CUSTOMERS = [
  { name: "Anita Reddy", phone: "98100 01001" },
  { name: "Karan Mehta", phone: "98100 01002" },
  { name: "Priya Sharma", phone: "98100 01004" },
  { name: "Lakshmi Devi", phone: "98100 01042" },
  { name: "Vikram Singh", phone: "98100 01006" },
] as const;

function devSampleIndex(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i)) >>> 0;
  }
  return hash % DEV_SAMPLE_CUSTOMERS.length;
}

function resolvePiiDisplayValue(value: string, kind: "name" | "phone"): string {
  const decrypted = decryptPii(value);
  if (!decrypted.startsWith(ENC_PREFIX)) return decrypted;

  if (isProduction()) {
    return kind === "name" ? "Customer" : "";
  }

  const sample = DEV_SAMPLE_CUSTOMERS[devSampleIndex(decrypted)]!;
  return kind === "name" ? sample.name : sample.phone;
}

export function prepareCustomerPii(name: string, phone: string) {
  const searchFields = buildCustomerSearchFields(name, phone);
  return {
    name: encryptPii(name),
    phone: encryptPii(phone),
    phoneHash: hashPhone(phone),
    nameSearch: searchFields.customerNameSearch,
    phoneLast4: searchFields.phoneLast4,
    customerNameSearch: searchFields.customerNameSearch,
  };
}

export function decryptCustomerFields<T extends { name: string; phone: string }>(
  record: T,
): T {
  return {
    ...record,
    name: resolvePiiDisplayValue(record.name, "name"),
    phone: resolvePiiDisplayValue(record.phone, "phone"),
  };
}

export function decryptVisitPii<T extends { customerName: string; customerPhone: string }>(
  record: T,
): T {
  return {
    ...record,
    customerName: resolvePiiDisplayValue(record.customerName, "name"),
    customerPhone: resolvePiiDisplayValue(record.customerPhone, "phone"),
  };
}

export { hashPhone };
