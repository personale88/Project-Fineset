import type { Content } from "@/content/en";
import type { CreateFieldSaleInput } from "@/lib/validations/field-sale.schema";
import type { PortalFormSuccessPaths } from "@/lib/utils/portal-form-paths";

export type FieldSalesFormCopy = Content["fieldSalesForm"];
export type CommonCopy = Content["common"];
export type ErrorsCopy = Content["errors"];

export interface FieldSalesFormProps {
  copy: FieldSalesFormCopy;
  common: CommonCopy;
  errors: ErrorsCopy;
  successPaths?: PortalFormSuccessPaths;
}

export type FieldSalesFormValues = CreateFieldSaleInput & {
  followUpPreferredTime?: string;
};

export type FieldSalesFormSectionId =
  | "customer"
  | "activity"
  | "scheme"
  | "noEnrollment"
  | "followUp";

export interface FieldSalesFormSection {
  id: FieldSalesFormSectionId;
  title: string;
}

export function getDefaultFieldSaleValues(): FieldSalesFormValues {
  const now = new Date();

  return {
    customerName: "",
    customerPhone: "",
    customerType: "NEW",
    area: "",
    gender: undefined,
    ageGroup: undefined,
    profession: "",
    activityType: "DOOR_TO_DOOR",
    locationLabel: "",
    activityDate: now,
    startTime: now,
    endTime: undefined,
    schemesPitched: [],
    enrollmentOutcome: undefined,
    monthlyCommitment: undefined,
    intentTier: undefined,
    reasonNoEnrollment: undefined,
    competitorMention: "",
    followUpNeeded: false,
    followUpDate: undefined,
    followUpPreferredTime: undefined,
    staffNotes: "",
  };
}

export function getSectionFieldNames(
  sectionId: FieldSalesFormSectionId,
  enrollmentOutcome?: FieldSalesFormValues["enrollmentOutcome"],
  schemesPitched?: FieldSalesFormValues["schemesPitched"],
): (keyof FieldSalesFormValues)[] {
  const noSchemesPitched = schemesPitched?.includes("NONE");

  switch (sectionId) {
    case "customer":
      return [
        "customerPhone",
        "customerName",
        "customerType",
        "area",
        "gender",
        "ageGroup",
        "profession",
      ];
    case "activity":
      return [
        "activityType",
        "locationLabel",
        "activityDate",
        "startTime",
        "endTime",
      ];
    case "scheme":
      return [
        "schemesPitched",
        ...(noSchemesPitched
          ? []
          : ["enrollmentOutcome", "monthlyCommitment"] as const),
        "intentTier",
      ];
    case "noEnrollment":
      return ["reasonNoEnrollment", "competitorMention"];
    case "followUp":
      return ["followUpNeeded", "followUpDate", "followUpPreferredTime", "staffNotes"];
    default:
      return enrollmentOutcome ? [] : [];
  }
}

export function buildFieldSalesSections(
  copy: FieldSalesFormCopy,
  enrollmentOutcome?: FieldSalesFormValues["enrollmentOutcome"],
  schemesPitched?: FieldSalesFormValues["schemesPitched"],
): FieldSalesFormSection[] {
  const all: FieldSalesFormSection[] = [
    { id: "customer", title: copy.sections.customer },
    { id: "activity", title: copy.sections.activity },
    { id: "scheme", title: copy.sections.scheme },
    { id: "noEnrollment", title: copy.sections.noEnrollment },
    { id: "followUp", title: copy.sections.followUp },
  ];

  if (
    schemesPitched?.includes("NONE") ||
    (enrollmentOutcome !== "DECLINED" && enrollmentOutcome !== "CALLBACK")
  ) {
    return all.filter((section) => section.id !== "noEnrollment");
  }

  return all;
}

export function getSchemePitchCopy(copy: FieldSalesFormCopy) {
  return {
    schemeHint: copy.schemeHint,
    schemesPitched: copy.fields.schemesPitched,
    enrollmentOutcome: copy.fields.enrollmentOutcome,
    monthlyCommitment: copy.fields.monthlyCommitment,
    intentTier: copy.fields.intentTier,
    reasonNoEnrollment: copy.fields.reasonNoEnrollment,
    schemeCompetitorMention: copy.fields.competitorMention,
  };
}

export {
  formatDateForInput,
  formatTimeForInput,
  parseDateInput,
  parseTimeInput,
} from "@/components/forms/VisitForm/VisitForm.types";
