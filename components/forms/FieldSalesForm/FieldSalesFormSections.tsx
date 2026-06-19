"use client";

import type { Control, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { calculateDurationMins, formatDurationMins } from "@/lib/utils/formatters";
import { SchemePitchOutcomeSection } from "@/components/forms/shared/SchemePitchOutcomeSection";
import type {
  FieldSalesFormCopy,
  FieldSalesFormSectionId,
  FieldSalesFormValues,
} from "./FieldSalesForm.types";
import { getSchemePitchCopy } from "./FieldSalesForm.types";
import { ActivitySection } from "./sections/ActivitySection";
import { CustomerSection } from "./sections/CustomerSection";
import { FollowUpSection } from "./sections/FollowUpSection";
import { NoEnrollmentSection } from "./sections/NoEnrollmentSection";
import { shouldShowSection } from "./sections/utils";

interface FieldSalesFormSectionsProps {
  copy: FieldSalesFormCopy;
  control: Control<FieldSalesFormValues>;
  watch: UseFormWatch<FieldSalesFormValues>;
  setValue: UseFormSetValue<FieldSalesFormValues>;
  activeSection?: FieldSalesFormSectionId;
  mode: "wizard" | "full";
}

export function FieldSalesFormSections({
  copy,
  control,
  watch,
  setValue,
  activeSection,
  mode,
}: FieldSalesFormSectionsProps) {
  const enrollmentOutcome = watch("enrollmentOutcome");
  const schemesPitched = watch("schemesPitched");
  const followUpNeeded = watch("followUpNeeded");
  const startTime = watch("startTime");
  const endTime = watch("endTime");

  const totalDurationLabel =
    startTime && endTime && endTime > startTime
      ? formatDurationMins(calculateDurationMins(startTime, endTime))
      : null;

  return (
    <div className="space-y-4 lg:space-y-6">
      {shouldShowSection("customer", activeSection, mode) && (
        <CustomerSection copy={copy} control={control} watch={watch} setValue={setValue} />
      )}

      {shouldShowSection("activity", activeSection, mode) && (
        <ActivitySection
          copy={copy}
          control={control}
          totalDurationLabel={totalDurationLabel}
        />
      )}

      {shouldShowSection("scheme", activeSection, mode) && (
        <SchemePitchOutcomeSection
          title={copy.sections.scheme}
          copy={getSchemePitchCopy(copy)}
          control={control}
          schemesPitched={schemesPitched}
          enrollmentOutcome={enrollmentOutcome}
          id="section-scheme"
        />
      )}

      {shouldShowSection("noEnrollment", activeSection, mode) &&
        !schemesPitched.includes("NONE") &&
        (enrollmentOutcome === "DECLINED" || enrollmentOutcome === "CALLBACK") && (
          <NoEnrollmentSection copy={copy} control={control} />
        )}

      {shouldShowSection("followUp", activeSection, mode) && (
        <FollowUpSection
          copy={copy}
          control={control}
          followUpNeeded={followUpNeeded}
        />
      )}
    </div>
  );
}
