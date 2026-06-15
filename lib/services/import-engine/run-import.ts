import {
  CallAnswerStatus,
  CustomerType,
  PurchaseStatus,
  SourceChannel,
  type VisitType,
} from "@prisma/client";
import { IMPORT_CONFIG, chunkSizeForRowCount } from "@/lib/import-engine/config";
import { getSchemaConfig } from "@/lib/import-engine/schema-configs";
import type { ImportPayload, ImportResult, TransformedRow } from "@/lib/import-engine/types";
import { rowsForImport } from "@/lib/import-engine/core/validator";
import { prisma } from "@/lib/db/prisma";
import {
  resolveImportCustomerName,
  resolveImportCustomerPhone,
  resolveImportStaffId,
} from "@/lib/services/import-engine/import-row-resolvers";
import { prepareCustomerPii } from "@/lib/services/pii";
import { createVisit } from "@/lib/services/visits";
import type { CreateVisitInput } from "@/lib/validations/visit.schema";

interface RunImportParams extends ImportPayload {
  storeId: string;
  importedByAuthId: string;
  fileName?: string;
  /** When agent name is not mapped, attribute calls to this staff member. */
  importingStaffId?: string | null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asDate(value: unknown): Date | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asSourceChannel(value: unknown): SourceChannel {
  const channel = asString(value);
  if (channel && Object.values(SourceChannel).includes(channel as SourceChannel)) {
    return channel as SourceChannel;
  }
  return SourceChannel.OTHER;
}

function resolveCustomerType(row: TransformedRow): CustomerType {
  const mapped = asString(row.transformedData.customerType);
  if (mapped === "VIP") return CustomerType.VIP;
  if (mapped === "REPEAT" || row.customerType === "repeat") return CustomerType.REPEAT;
  return CustomerType.NEW;
}

function resolvePurchaseStatus(row: TransformedRow): CreateVisitInput["purchaseStatus"] {
  const mapped = asString(row.transformedData.purchaseStatus);
  if (mapped === "PURCHASED") return "PURCHASED";
  if (mapped === "NOT_PURCHASED") return "NOT_PURCHASED";
  const amount = asNumber(row.transformedData.transactionAmount);
  return amount && amount > 0 ? "PURCHASED" : "NOT_PURCHASED";
}

function optionalField<T>(value: unknown): T | undefined {
  if (value === null || value === undefined) return undefined;
  return value as T;
}

function mapCallAnswered(value: unknown): CallAnswerStatus {
  const normalised = String(value ?? "").toUpperCase();
  if (normalised === "NOT_ANSWERED" || normalised === "NO_ANSWER") {
    return CallAnswerStatus.NOT_ANSWERED;
  }
  return CallAnswerStatus.ANSWERED;
}

async function upsertCustomerFromRow(
  row: TransformedRow,
  storeId: string,
): Promise<{ customerId: string; isNew: boolean }> {
  const name = asString(row.customerData.name) ?? "Customer";
  const phone = asString(row.customerData.phone);
  if (!phone) throw new Error("Customer phone is required");

  const pii = prepareCustomerPii(name, phone);

  if (row.customerType === "repeat" && row.existingCustomerId) {
    await prisma.customer.update({
      where: { id: row.existingCustomerId },
      data: {
        name: pii.name,
        phone: pii.phone,
        phoneHash: pii.phoneHash,
        nameSearch: pii.customerNameSearch,
        phoneLast4: pii.phoneLast4,
      },
    });
    return { customerId: row.existingCustomerId, isNew: false };
  }

  const customer = await prisma.customer.upsert({
    where: {
      phoneHash_storeId: {
        phoneHash: pii.phoneHash,
        storeId,
      },
    },
    create: {
      storeId,
      name: pii.name,
      phone: pii.phone,
      phoneHash: pii.phoneHash,
      nameSearch: pii.customerNameSearch,
      phoneLast4: pii.phoneLast4,
    },
    update: {
      name: pii.name,
      phone: pii.phone,
      nameSearch: pii.customerNameSearch,
      phoneLast4: pii.phoneLast4,
    },
  });

  return {
    customerId: customer.id,
    isNew: row.customerType === "new",
  };
}

async function resolveFallbackStaffId(storeId: string): Promise<string | null> {
  const staff = await prisma.staff.findFirst({
    where: { storeId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true },
  });
  return staff?.id ?? null;
}

async function importVisitRow(
  row: TransformedRow,
  storeId: string,
  batchId: string,
  fallbackStaffId: string | null,
): Promise<void> {
  const staffId = resolveImportStaffId(row, fallbackStaffId);
  const customerName = resolveImportCustomerName(row);
  const customerPhone = resolveImportCustomerPhone(row);

  if (!staffId) {
    throw new Error(
      "No staff member is available in this store. Add at least one active staff member, then retry the import.",
    );
  }

  const visitType = asString(row.transformedData.visitType);
  const staffNotes = [
    asString(row.transformedData.staffNotes),
    !asString(row.transformedData.staffId)
      ? "Imported without a matched staff name in the spreadsheet."
      : null,
    !asString(row.customerData.phone)
      ? "Imported without a customer phone number in the spreadsheet."
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const visit = await createVisit({
    storeId,
    staffId,
    customerName,
    customerPhone,
    customerType: resolveCustomerType(row),
    visitType: (visitType === "APPOINTMENT" ? "APPOINTMENT" : "WALK_IN") as VisitType,
    sourceChannel: asSourceChannel(row.transformedData.sourceChannel),
    purchaseStatus: resolvePurchaseStatus(row),
    visitDate: asDate(row.transformedData.visitDate),
    inTime: asDate(row.transformedData.inTime),
    outTime: asDate(row.transformedData.outTime),
    area: asString(row.transformedData.area),
    address: asString(row.transformedData.address),
    profession: asString(row.transformedData.profession),
    gender: optionalField<CreateVisitInput["gender"]>(row.transformedData.gender),
    ageGroup: optionalField<CreateVisitInput["ageGroup"]>(row.transformedData.ageGroup),
    dateOfBirth: asDate(row.transformedData.dateOfBirth),
    anniversary: asDate(row.transformedData.anniversary),
    productsExplored: asStringArray(
      row.transformedData.productsExplored,
    ) as CreateVisitInput["productsExplored"],
    productsPurchased: asStringArray(
      row.transformedData.productsPurchased,
    ) as CreateVisitInput["productsPurchased"],
    transactionAmount: asNumber(row.transformedData.transactionAmount),
    intentTier: optionalField<CreateVisitInput["intentTier"]>(row.transformedData.intentTier),
    reasonNoPurchase: optionalField<CreateVisitInput["reasonNoPurchase"]>(
      row.transformedData.reasonNoPurchase,
    ),
    competitorMention: asString(row.transformedData.competitorMention),
    purchaseOccasion: optionalField<CreateVisitInput["purchaseOccasion"]>(
      row.transformedData.purchaseOccasion,
    ),
    metalKtPref: optionalField<CreateVisitInput["metalKtPref"]>(row.transformedData.metalKtPref),
    budgetStated: optionalField<CreateVisitInput["budgetStated"]>(row.transformedData.budgetStated),
    schemesPitched: asStringArray(
      row.transformedData.schemesPitched,
    ) as CreateVisitInput["schemesPitched"],
    enrollmentOutcome: optionalField<CreateVisitInput["enrollmentOutcome"]>(
      row.transformedData.enrollmentOutcome,
    ),
    monthlyCommitment: asNumber(row.transformedData.monthlyCommitment),
    reasonNoEnrollment: optionalField<CreateVisitInput["reasonNoEnrollment"]>(
      row.transformedData.reasonNoEnrollment,
    ),
    schemeCompetitorMention: asString(row.transformedData.schemeCompetitorMention),
    followUpNeeded: asBoolean(row.transformedData.followUpNeeded) ?? false,
    followUpDate: asDate(row.transformedData.followUpDate),
    staffNotes: staffNotes || undefined,
  });

  const durationMins = asNumber(row.transformedData.durationMins);
  await prisma.visit.update({
    where: { id: visit.id },
    data: {
      importBatchId: batchId,
      importedAt: new Date(),
      ...(durationMins != null ? { durationMins } : {}),
    },
  });
}

async function importCallLogRow(
  row: TransformedRow,
  storeId: string,
  batchId: string,
  fallbackStaffId: string | null,
): Promise<void> {
  const staffId = resolveImportStaffId(row, fallbackStaffId);
  const customerPhone = resolveImportCustomerPhone(row);
  const customerName = resolveImportCustomerName(row);
  if (!staffId) {
    throw new Error(
      "No staff member is available in this store. Add at least one active staff member, then retry the import.",
    );
  }

  row.customerData.phone = customerPhone;
  row.customerData.name = customerName;

  const { customerId } = await upsertCustomerFromRow(row, storeId);
  const callDate = asDate(row.transformedData.createdAt) ?? new Date();
  const durationSeconds = asNumber(row.transformedData.durationSeconds);
  const notes = asString(row.transformedData.feedback);
  const feedbackParts = [
    durationSeconds ? `Duration: ${durationSeconds}s` : null,
    notes,
  ].filter(Boolean);

  let visit = await prisma.visit.findFirst({
    where: { storeId, customerId, visitDate: callDate },
    orderBy: { createdAt: "desc" },
  });

  if (!visit) {
    visit = await createVisit({
      storeId,
      staffId,
      customerName,
      customerPhone,
      customerType: row.customerType === "repeat" ? CustomerType.REPEAT : CustomerType.NEW,
      visitType: "WALK_IN",
      sourceChannel: SourceChannel.PHONE,
      purchaseStatus: PurchaseStatus.NOT_PURCHASED,
      productsExplored: [],
      productsPurchased: [],
      schemesPitched: [],
      followUpNeeded: false,
      visitDate: callDate,
    });
  }

  const answered = mapCallAnswered(row.transformedData.answered);

  await prisma.staffCallLog.create({
    data: {
      visitId: visit.id,
      staffId,
      answered,
      feedback: feedbackParts.length > 0 ? feedbackParts.join(" · ") : undefined,
      createdAt: callDate,
      importBatchId: batchId,
      importedAt: new Date(),
    },
  });

  await prisma.visit.update({
    where: { id: visit.id },
    data: {
      lastCallAnswered: answered,
      lastCallAt: callDate,
      importBatchId: batchId,
      importedAt: new Date(),
    },
  });
}

export async function runImport(params: RunImportParams): Promise<ImportResult> {
  const startedAt = Date.now();
  const schema = getSchemaConfig(params.featureKey);
  if (!schema) {
    throw new Error(`Unknown feature key: ${params.featureKey}`);
  }

  const importRows = rowsForImport(params.rows);
  const chunkSize = chunkSizeForRowCount(importRows.length);
  const errors: ImportResult["errors"] = [];
  const fallbackStaffId =
    params.importingStaffId ?? (await resolveFallbackStaffId(params.storeId));

  let successCount = 0;
  let newCustomersCreated = 0;
  let repeatCustomersUpdated = 0;

  for (let offset = 0; offset < importRows.length; offset += chunkSize) {
    const chunk = importRows.slice(offset, offset + chunkSize);
    for (const row of chunk) {
      try {
        if (params.featureKey === "visit_log") {
          await importVisitRow(row, params.storeId, params.batchId, fallbackStaffId);
        } else if (params.featureKey === "call_log") {
          await importCallLogRow(row, params.storeId, params.batchId, fallbackStaffId);
        } else {
          throw new Error(`Unsupported feature: ${params.featureKey}`);
        }

        if (row.customerType === "new") newCustomersCreated += 1;
        if (row.customerType === "repeat") repeatCustomersUpdated += 1;
        successCount += 1;
      } catch (error) {
        errors.push({
          rowIndex: row.originalIndex,
          error: error instanceof Error ? error.message : "Import failed",
        });
      }
    }
  }

  const rollbackUntil = new Date();
  rollbackUntil.setHours(
    rollbackUntil.getHours() + IMPORT_CONFIG.rollbackWindowHours,
  );

  await prisma.importHistory.create({
    data: {
      batchId: params.batchId,
      featureKey: params.featureKey,
      fileName: params.fileName ?? null,
      storeId: params.storeId,
      totalRows: params.rows.length,
      successCount,
      errorCount: errors.length,
      newCustomers: newCustomersCreated,
      repeatCustomers: repeatCustomersUpdated,
      importedByAuthId: params.importedByAuthId,
      rollbackAvailableUntil: rollbackUntil,
    },
  });

  return {
    batchId: params.batchId,
    totalProcessed: importRows.length,
    successCount,
    errorCount: errors.length,
    newCustomersCreated,
    repeatCustomersUpdated,
    errors,
    durationMs: Date.now() - startedAt,
  };
}

export async function rollbackImport(
  batchId: string,
  authId: string,
): Promise<{ deletedVisitLogs: number; deletedCallLogs: number; deletedCustomers: number }> {
  const history = await prisma.importHistory.findUnique({ where: { batchId } });
  if (!history) throw new Error("Import batch not found");
  if (history.importedByAuthId !== authId) throw new Error("Not authorized to rollback this import");
  if (history.rolledBackAt) throw new Error("Import already rolled back");
  if (history.rollbackAvailableUntil < new Date()) {
    throw new Error("Rollback window has expired");
  }

  const deletedCallLogs = await prisma.staffCallLog.deleteMany({
    where: { importBatchId: batchId },
  });

  const batchVisits = await prisma.visit.findMany({
    where: { importBatchId: batchId },
    select: { id: true, customerId: true },
  });

  const deletedVisitLogs = await prisma.visit.deleteMany({
    where: { importBatchId: batchId },
  });

  let deletedCustomers = 0;
  const customerIds = [
    ...new Set(batchVisits.map((visit) => visit.customerId).filter(Boolean)),
  ] as string[];

  for (const customerId of customerIds) {
    const [visitCount, fieldSaleCount] = await Promise.all([
      prisma.visit.count({ where: { customerId } }),
      prisma.fieldSale.count({ where: { customerId } }),
    ]);
    if (visitCount === 0 && fieldSaleCount === 0) {
      await prisma.customer.delete({ where: { id: customerId } }).catch(() => undefined);
      deletedCustomers += 1;
    }
  }

  await prisma.importHistory.update({
    where: { batchId },
    data: { rolledBackAt: new Date() },
  });

  return {
    deletedVisitLogs: deletedVisitLogs.count,
    deletedCallLogs: deletedCallLogs.count,
    deletedCustomers,
  };
}
