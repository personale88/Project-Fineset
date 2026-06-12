import type { Content } from "@/content/en";
import type { CreateVisitInput } from "@/lib/validations/visit.schema";

export type VisitFormCopy = Content["visitForm"];
export type CommonCopy = Content["common"];
export type ErrorsCopy = Content["errors"];

export interface VisitFormProps {
  copy: VisitFormCopy;
  common: CommonCopy;
  errors: ErrorsCopy;
}

export type VisitFormValues = CreateVisitInput;

export type VisitFormSectionId =
  | "customer"
  | "visit"
  | "scheme"
  | "noPurchase"
  | "preferences"
  | "followUp";

export interface VisitFormSection {
  id: VisitFormSectionId;
  title: string;
}

export type VisitDraftFields = Pick<
  VisitFormValues,
  | "visitDate"
  | "customerType"
  | "visitType"
  | "sourceChannel"
  | "area"
  | "address"
  | "profession"
  | "gender"
  | "ageGroup"
  | "dateOfBirth"
  | "anniversary"
  | "productsExplored"
  | "purchaseStatus"
  | "productsPurchased"
  | "intentTier"
  | "reasonNoPurchase"
  | "purchaseOccasion"
  | "metalKtPref"
  | "budgetStated"
  | "schemesPitched"
  | "enrollmentOutcome"
  | "followUpNeeded"
>;

export const VISIT_DRAFT_STORAGE_KEY = "fineset-visit-draft-v2";

function resolveDraftPurchaseStatus(
  status?: VisitDraftFields["purchaseStatus"],
): VisitFormValues["purchaseStatus"] {
  if (status === "PURCHASED" || status === "NOT_PURCHASED") {
    return status;
  }
  return undefined;
}

export function getDefaultVisitDate(): Date {
  return parseDateInput(formatDateForInput(new Date()));
}

export function getDefaultVisitValues(
  draft?: Partial<VisitDraftFields>,
): VisitFormValues {
  return {
    customerName: "",
    customerPhone: "",
    customerType: draft?.customerType ?? "NEW",
    visitType: draft?.visitType ?? "WALK_IN",
    visitDate: draft?.visitDate ?? getDefaultVisitDate(),
    inTime: undefined,
    outTime: undefined,
    sourceChannel: draft?.sourceChannel ?? "ORGANIC_WALK_IN",
    area: draft?.area,
    address: draft?.address,
    profession: draft?.profession,
    gender: draft?.gender,
    ageGroup: draft?.ageGroup,
    dateOfBirth: draft?.dateOfBirth,
    anniversary: draft?.anniversary,
    productsExplored: draft?.productsExplored ?? [],
    purchaseStatus: resolveDraftPurchaseStatus(draft?.purchaseStatus),
    productsPurchased: draft?.productsPurchased ?? [],
    transactionAmount: undefined,
    intentTier: draft?.intentTier,
    reasonNoPurchase: draft?.reasonNoPurchase,
    competitorMention: undefined,
    purchaseOccasion: draft?.purchaseOccasion,
    metalKtPref: draft?.metalKtPref,
    budgetStated: draft?.budgetStated,
    schemesPitched: draft?.schemesPitched ?? [],
    enrollmentOutcome: draft?.enrollmentOutcome,
    monthlyCommitment: undefined,
    reasonNoEnrollment: undefined,
    schemeCompetitorMention: undefined,
    followUpNeeded: draft?.followUpNeeded ?? false,
    followUpDate: undefined,
    staffNotes: undefined,
  };
}

export function formatTimeForInput(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function parseTimeInput(time: string, baseDate: Date = new Date()): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function formatDateForInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateInput(value: string): Date {
  const parsed = new Date(`${value}T12:00:00`);
  return parsed;
}

export function extractDraftFields(values: VisitFormValues): VisitDraftFields {
  return {
    visitDate: values.visitDate,
    customerType: values.customerType,
    visitType: values.visitType,
    sourceChannel: values.sourceChannel,
    area: values.area,
    address: values.address,
    profession: values.profession,
    gender: values.gender,
    ageGroup: values.ageGroup,
    dateOfBirth: values.dateOfBirth,
    anniversary: values.anniversary,
    productsExplored: values.productsExplored,
    purchaseStatus: resolveDraftPurchaseStatus(values.purchaseStatus),
    productsPurchased: values.productsPurchased,
    intentTier: values.intentTier,
    reasonNoPurchase: values.reasonNoPurchase,
    purchaseOccasion: values.purchaseOccasion,
    metalKtPref: values.metalKtPref,
    budgetStated: values.budgetStated,
    schemesPitched: values.schemesPitched,
    enrollmentOutcome: values.enrollmentOutcome,
    followUpNeeded: values.followUpNeeded,
  };
}

export function getSectionFieldNames(
  sectionId: VisitFormSectionId,
  purchaseStatus?: VisitFormValues["purchaseStatus"],
  enrollmentOutcome?: VisitFormValues["enrollmentOutcome"],
  schemesPitched?: VisitFormValues["schemesPitched"],
): (keyof VisitFormValues)[] {
  const noSchemesPitched = schemesPitched?.includes("NONE");

  switch (sectionId) {
    case "customer":
      return [
        "visitDate",
        "customerPhone",
        "customerName",
        "customerType",
        "visitType",
        "inTime",
        "outTime",
        "sourceChannel",
        "area",
        "address",
        "profession",
        "gender",
        "ageGroup",
        "dateOfBirth",
        "anniversary",
      ];
    case "visit":
      return [
        "purchaseStatus",
        ...(purchaseStatus === "NOT_PURCHASED" ? (["productsExplored"] as const) : []),
        ...(purchaseStatus === "PURCHASED"
          ? (["productsPurchased", "transactionAmount"] as const)
          : []),
      ];
    case "scheme":
      return [
        "schemesPitched" as const,
        ...(noSchemesPitched
          ? []
          : [
              "enrollmentOutcome" as const,
              ...(enrollmentOutcome === "ENROLLED_GHS" ||
              enrollmentOutcome === "ENROLLED_GPP" ||
              enrollmentOutcome === "ENROLLED_BOTH"
                ? (["monthlyCommitment"] as const)
                : []),
              ...(enrollmentOutcome === "DECLINED" || enrollmentOutcome === "CALLBACK"
                ? (["reasonNoEnrollment", "schemeCompetitorMention"] as const)
                : []),
            ]),
        "intentTier" as const,
      ];
    case "noPurchase":
      return ["reasonNoPurchase", "competitorMention"];
    case "preferences":
      return ["purchaseOccasion", "metalKtPref", "budgetStated"];
    case "followUp":
      return ["followUpNeeded", "followUpDate", "staffNotes"];
  }
}

export function buildSections(
  copy: VisitFormCopy,
  purchaseStatus: VisitFormValues["purchaseStatus"],
): VisitFormSection[] {
  const all: VisitFormSection[] = [
    { id: "customer", title: copy.sections.customer },
    { id: "visit", title: copy.sections.visit },
    { id: "scheme", title: copy.sections.scheme },
    { id: "noPurchase", title: copy.sections.noPurchase },
    { id: "preferences", title: copy.sections.preferences },
    { id: "followUp", title: copy.sections.followUp },
  ];

  if (purchaseStatus !== "NOT_PURCHASED") {
    return all.filter((section) => section.id !== "noPurchase");
  }

  return all;
}

export function getSchemePitchCopy(copy: VisitFormCopy) {
  return {
    schemeHint: copy.schemeHint,
    schemesPitched: copy.fields.schemesPitched,
    enrollmentOutcome: copy.fields.enrollmentOutcome,
    monthlyCommitment: copy.fields.monthlyCommitment,
    intentTier: {
      label: copy.fields.intentTier.label,
      placeholder: copy.fields.intentTier.placeholder,
      options: copy.fields.intentTier.options,
    },
    reasonNoEnrollment: copy.fields.reasonNoEnrollment,
    schemeCompetitorMention: copy.fields.schemeCompetitorMention,
  };
}
