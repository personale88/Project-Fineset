"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createVisitSchema } from "@/lib/validations/visit.schema";
import { useCreateVisit } from "@/hooks/useVisits";
import { toast } from "@/hooks/useToast";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "./FormSection";
import { VisitFormSections } from "./VisitFormSections";
import { VisitFormSuccess } from "./VisitFormSuccess";
import { buildClientVisitFormValues, clearVisitDraft, loadVisitDraft, useVisitDraft } from "./useVisitDraft";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import { buildFollowUpsHref } from "@/lib/utils/follow-ups-url";
import {
  buildSections,
  getDefaultVisitValues,
  getSectionFieldNames,
  type VisitFormProps,
  type VisitFormValues,
} from "./VisitForm.types";

export function VisitForm({ copy, common, errors }: VisitFormProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSubmittedFollowUp, setLastSubmittedFollowUp] = useState(false);

  const form = useForm<VisitFormValues>({
    resolver: zodResolver(createVisitSchema),
    defaultValues: getDefaultVisitValues(),
    mode: "onBlur",
  });

  const { watch, control, handleSubmit, reset, trigger } = form;
  const purchaseStatus = watch("purchaseStatus");
  const enrollmentOutcome = watch("enrollmentOutcome");
  const schemesPitched = watch("schemesPitched");
  const sections = useMemo(
    () => buildSections(copy, purchaseStatus),
    [copy, purchaseStatus],
  );

  const createVisitMutation = useCreateVisit();
  useVisitDraft(watch, reset, !isSuccess);

  const activeSection = sections[stepIndex]?.id;
  const isLastStep = stepIndex >= sections.length - 1;

  useEffect(() => {
    if (stepIndex >= sections.length) {
      setStepIndex(Math.max(sections.length - 1, 0));
    }
  }, [sections.length, stepIndex]);

  const progressLabel = copy.progress
    .replace("{current}", String(stepIndex + 1))
    .replace("{total}", String(sections.length));

  const resetForm = useCallback(() => {
    reset(buildClientVisitFormValues(loadVisitDraft()));
    setStepIndex(0);
    setSubmitError(null);
    setIsSuccess(false);
  }, [reset]);

  async function validateCurrentStep(): Promise<boolean> {
    if (!activeSection) return true;

    if (activeSection === "noPurchase" && purchaseStatus !== "NOT_PURCHASED") {
      return true;
    }

    return trigger(
      getSectionFieldNames(
        activeSection,
        purchaseStatus,
        enrollmentOutcome,
        schemesPitched,
      ),
    );
  }

  function handlePrevious() {
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  async function onSubmit(values: VisitFormValues) {
    setSubmitError(null);

    try {
      await createVisitMutation.mutateAsync(values);
      clearVisitDraft();
      setLastSubmittedFollowUp(Boolean(values.followUpNeeded && values.followUpDate));
      toast({ title: copy.actions.successTitle, description: copy.actions.successMessage });
      setIsSuccess(true);
    } catch (error) {
      const message = getPortalErrorMessage(error, errors);
      setSubmitError(message);
      toast({ title: message });
    }
  }

  async function handleMobilePrimaryAction() {
    if (createVisitMutation.isPending) return;

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
    const secondaryActions = [
      { label: copy.actions.viewMyVisits, href: `${STAFF_DASHBOARD_PATH}/my-visits` },
      { label: copy.actions.viewCalls, href: `${STAFF_DASHBOARD_PATH}/calls` },
      ...(lastSubmittedFollowUp
        ? [
            {
              label: copy.actions.viewFollowUps,
              href: buildFollowUpsHref(`${STAFF_DASHBOARD_PATH}/follow-ups`, "open"),
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

        <div className="lg:hidden">
          <VisitFormSections
            copy={copy}
            control={control}
            watch={watch}
            activeSection={activeSection}
            mode="wizard"
            enrollmentOutcome={enrollmentOutcome}
            schemesPitched={schemesPitched}
          />
        </div>

        <div className="hidden lg:block">
          <VisitFormSections
            copy={copy}
            control={control}
            watch={watch}
            mode="full"
            enrollmentOutcome={enrollmentOutcome}
            schemesPitched={schemesPitched}
          />
        </div>

        {submitError && (
          <p className="text-sm text-status-error" role="alert">
            {submitError}
          </p>
        )}

        <div className="sticky bottom-0 z-10 -mx-page-x border-t border-border bg-surface-primary/95 px-page-x py-4 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
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
                disabled={createVisitMutation.isPending}
                onClick={() => void handleMobilePrimaryAction()}
              >
                {createVisitMutation.isPending
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
              disabled={createVisitMutation.isPending}
            >
              {createVisitMutation.isPending
                ? copy.actions.saving
                : copy.actions.submit}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
