"use client";

import type { Control, UseFormWatch } from "react-hook-form";
import { SchemePitchOutcomeSection } from "@/components/forms/shared/SchemePitchOutcomeSection";
import type {
  VisitFormCopy,
  VisitFormSectionId,
  VisitFormValues,
} from "./VisitForm.types";
import { getSchemePitchCopy } from "./VisitForm.types";
import { CustomerSection } from "./sections/CustomerSection";
import { VisitSection } from "./sections/VisitSection";
import { NoPurchaseSection } from "./sections/NoPurchaseSection";
import { PreferencesSection } from "./sections/PreferencesSection";
import { FollowUpSection } from "./sections/FollowUpSection";
import { shouldShowSection } from "./sections/utils";

interface VisitFormSectionsProps {
  copy: VisitFormCopy;
  control: Control<VisitFormValues>;
  watch: UseFormWatch<VisitFormValues>;
  activeSection?: VisitFormSectionId;
  mode: "wizard" | "full";
  enrollmentOutcome?: VisitFormValues["enrollmentOutcome"];
  schemesPitched?: VisitFormValues["schemesPitched"];
}

export function VisitFormSections({
  copy,
  control,
  watch,
  activeSection,
  mode,
  enrollmentOutcome,
  schemesPitched = [],
}: VisitFormSectionsProps) {
  const purchaseStatus = watch("purchaseStatus");
  const followUpNeeded = watch("followUpNeeded");
  const visitDate = watch("visitDate");
  const inTime = watch("inTime");
  const outTime = watch("outTime");

  return (
    <div className="space-y-4 lg:space-y-6">
      {shouldShowSection("customer", activeSection, mode) && (
        <CustomerSection
          copy={copy}
          control={control}
          visitDate={visitDate}
          inTime={inTime}
          outTime={outTime}
        />
      )}

      {shouldShowSection("visit", activeSection, mode) && (
        <VisitSection
          copy={copy}
          control={control}
          purchaseStatus={purchaseStatus}
        />
      )}

      {shouldShowSection("scheme", activeSection, mode) && (
        <SchemePitchOutcomeSection
          title={copy.sections.scheme}
          copy={getSchemePitchCopy(copy)}
          control={control}
          schemesPitched={schemesPitched}
          enrollmentOutcome={enrollmentOutcome}
          showNoEnrollmentFields={
            !schemesPitched.includes("NONE") &&
            (enrollmentOutcome === "DECLINED" || enrollmentOutcome === "CALLBACK")
          }
          id="section-scheme"
        />
      )}

      {purchaseStatus === "NOT_PURCHASED" &&
        shouldShowSection("noPurchase", activeSection, mode) && (
          <NoPurchaseSection copy={copy} control={control} />
        )}

      {shouldShowSection("preferences", activeSection, mode) && (
        <PreferencesSection copy={copy} control={control} />
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
