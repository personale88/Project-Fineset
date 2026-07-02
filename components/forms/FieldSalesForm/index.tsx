"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFieldSaleSchema } from "@/lib/validations/field-sale.schema";
import { useCreateFieldSale } from "@/hooks/useFieldSales";
import { buildFollowUpSubmitPayload } from "@/lib/utils/follow-up-datetime";
import { toast } from "@/hooks/useToast";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { buildPortalFormSuccessPaths, type PortalFormSuccessPaths } from "@/lib/utils/portal-form-paths";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "@/components/forms/VisitForm/FormSection";
import { VisitFormSuccess } from "@/components/forms/VisitForm/VisitFormSuccess";
import { LocationVerificationPanel } from "@/components/field-force/LocationVerificationPanel";
import {
  isLocationCaptureSubmittable,
  useGeolocationCapture,
} from "@/hooks/useGeolocationCapture";
import { FIELD_SALE_LOCATION_SETTINGS } from "@/lib/field-force/field-sale-location";
import { FieldSalesFormSections } from "./FieldSalesFormSections";
import {
  buildClientFieldSaleFormValues,
  clearFieldSaleDraft,
  useFieldSaleDraft,
} from "./useFieldSaleDraft";
import {
  buildFieldSalesSections,
  getDefaultFieldSaleValues,
  getSectionFieldNames,
  type FieldSalesFormProps,
  type FieldSalesFormValues,
} from "./FieldSalesForm.types";

export function FieldSalesForm({ copy, common, errors, successPaths }: FieldSalesFormProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastSubmittedFollowUp, setLastSubmittedFollowUp] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const locationCapture = useGeolocationCapture({
    maxAccuracyMeters: FIELD_SALE_LOCATION_SETTINGS.maxAccuracyMeters,
  });

  useEffect(() => {
    void locationCapture.captureLocation();
  }, [locationCapture.captureLocation]);

  const form = useForm<FieldSalesFormValues>({
    resolver: zodResolver(createFieldSaleSchema),
    defaultValues: getDefaultFieldSaleValues(),
    mode: "onBlur",
  });

  const { watch, control, handleSubmit, reset, trigger, setValue, getValues } = form;
  const enrollmentOutcome = watch("enrollmentOutcome");
  const schemesPitched = watch("schemesPitched");
  const sections = useMemo(
    () => buildFieldSalesSections(copy, enrollmentOutcome, schemesPitched),
    [copy, enrollmentOutcome, schemesPitched],
  );

  const createFieldSaleMutation = useCreateFieldSale();
  useFieldSaleDraft(watch, reset, !isSuccess);

  const activeSection = sections[stepIndex]?.id;
  const isLastStep = stepIndex >= sections.length - 1;
  const canSubmitWithLocation = isLocationCaptureSubmittable(
    locationCapture,
    FIELD_SALE_LOCATION_SETTINGS.requireGpsForFieldSales,
    FIELD_SALE_LOCATION_SETTINGS.allowSubmitWithoutGps,
  );

  useEffect(() => {
    if (stepIndex >= sections.length) {
      setStepIndex(Math.max(sections.length - 1, 0));
    }
  }, [sections.length, stepIndex]);

  const progressLabel = copy.progress
    .replace("{current}", String(stepIndex + 1))
    .replace("{total}", String(sections.length));

  const resetForm = useCallback(() => {
    reset(buildClientFieldSaleFormValues());
    setStepIndex(0);
    setSubmitError(null);
    setIsSuccess(false);
    setLastSubmittedFollowUp(false);
    void locationCapture.captureLocation();
  }, [locationCapture.captureLocation, reset]);

  async function validateCurrentStep(): Promise<boolean> {
    if (!activeSection) return true;

    if (
      activeSection === "noEnrollment" &&
      enrollmentOutcome !== "DECLINED" &&
      enrollmentOutcome !== "CALLBACK"
    ) {
      return true;
    }

    return trigger(getSectionFieldNames(activeSection, enrollmentOutcome, schemesPitched));
  }

  function handlePrevious() {
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  async function onSubmit(_values: FieldSalesFormValues) {
    setSubmitError(null);
    const values = getValues();
    const freshLocation = await locationCapture.captureLocation();

    if (
      !isLocationCaptureSubmittable(
        freshLocation,
        FIELD_SALE_LOCATION_SETTINGS.requireGpsForFieldSales,
        FIELD_SALE_LOCATION_SETTINGS.allowSubmitWithoutGps,
      )
    ) {
      setSubmitError(copy.location.submitBlocked);
      return;
    }

    try {
      await createFieldSaleMutation.mutateAsync({
        ...buildFollowUpSubmitPayload(values),
        locationCapture: freshLocation.capture ?? undefined,
      });
      clearFieldSaleDraft();
      setLastSubmittedFollowUp(Boolean(values.followUpNeeded));
      toast({ title: copy.actions.successTitle, description: copy.actions.successMessage });
      setIsSuccess(true);
    } catch (error) {
      const message = getPortalErrorMessage(error, errors);
      setSubmitError(message);
      toast({ title: message });
    }
  }

  async function handleMobilePrimaryAction() {
    if (createFieldSaleMutation.isPending) return;

    const valid = await validateCurrentStep();
    if (!valid) return;

    if (!isLastStep) {
      setStepIndex((current) => Math.min(current + 1, sections.length - 1));
      return;
    }

    await handleSubmit(onSubmit)();
  }

  function handleFormKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter") return;
    if (event.target instanceof HTMLTextAreaElement) return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;

    event.preventDefault();
    void handleMobilePrimaryAction();
  }

  if (isSuccess) {
    const paths = successPaths ?? buildPortalFormSuccessPaths();
    const secondaryActions = [
      {
        label: copy.actions.viewMyFieldSales,
        href: paths.myFieldSales,
      },
      { label: copy.actions.viewCalls, href: paths.calls },
      ...(lastSubmittedFollowUp
        ? [
            {
              label: copy.actions.viewFollowUps,
              href: paths.followUps,
            },
          ]
        : []),
    ];

    return (
      <VisitFormSuccess
        title={copy.actions.successTitle}
        message={copy.actions.successMessage}
        logAnotherLabel={copy.actions.logAnother}
        onLogAnother={resetForm}
        secondaryActions={secondaryActions}
      />
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => event.preventDefault()}
        onKeyDown={handleFormKeyDown}
        className="space-y-4 lg:space-y-6"
      >
        <ProgressIndicator
          label={progressLabel}
          current={stepIndex + 1}
          total={sections.length}
        />

        <LocationVerificationPanel
          copy={copy.location}
          result={locationCapture}
          onRetry={() => {
            void locationCapture.captureLocation();
          }}
          isDetecting={locationCapture.state === "detecting"}
        />

        <div className="lg:hidden">
          <FieldSalesFormSections
            copy={copy}
            control={control}
            watch={watch}
            setValue={setValue}
            activeSection={activeSection}
            mode="wizard"
          />
        </div>

        <div className="hidden lg:block">
          <FieldSalesFormSections
            copy={copy}
            control={control}
            watch={watch}
            setValue={setValue}
            mode="full"
          />
        </div>

        {submitError && (
          <p className="text-sm text-status-error" role="alert">
            {submitError}
          </p>
        )}

        <div className="sticky bottom-0 z-10 -mx-page-x border-t border-border bg-surface-card px-page-x py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.08)] lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:pb-0 lg:shadow-none">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex gap-2 lg:hidden">
              {stepIndex > 0 && (
                <Button type="button" variant="outline" onClick={handlePrevious}>
                  {common.previous}
                </Button>
              )}
              <Button
                type="button"
                className="flex-1"
                disabled={createFieldSaleMutation.isPending || (isLastStep && !canSubmitWithLocation)}
                onClick={() => void handleMobilePrimaryAction()}
              >
                {createFieldSaleMutation.isPending
                  ? copy.actions.saving
                  : !isLastStep
                    ? common.next
                    : copy.actions.submit}
              </Button>
            </div>

            <Button
              type="button"
              onClick={() => void handleSubmit(onSubmit)()}
              className="hidden w-full lg:inline-flex lg:w-auto lg:min-w-[200px]"
              disabled={createFieldSaleMutation.isPending || !canSubmitWithLocation}
            >
              {createFieldSaleMutation.isPending
                ? copy.actions.saving
                : copy.actions.submit}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
