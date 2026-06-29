"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getAutomationLiveRunActionKeys,
  type AutomationLiveRunActionKey,
} from "@/lib/automation/run-now-summary";
import type { PlatformAutomationConfig } from "@/lib/automation/types";
import type { Content } from "@/content/en";

type RunNowConfirmCopy = Content["admin"]["automation"]["runNowConfirm"];

interface AutomationRunNowConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: PlatformAutomationConfig;
  copy: RunNowConfirmCopy;
  isRunning?: boolean;
  onConfirm: () => void;
}

export function AutomationRunNowConfirmDialog({
  open,
  onOpenChange,
  config,
  copy,
  isRunning = false,
  onConfirm,
}: AutomationRunNowConfirmDialogProps) {
  const actionKeys = getAutomationLiveRunActionKeys(config);
  const dryRunModeActive = config.global.dryRunMode;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="automation-run-now-dialog">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {dryRunModeActive ? (
          <p
            className="rounded-input border border-brand-gold/30 bg-brand-gold/5 px-4 py-3 text-sm text-text-secondary"
            data-testid="automation-run-now-dry-run-notice"
          >
            {copy.dryRunNotice}
          </p>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-medium text-text-primary">{copy.enabledActionsTitle}</p>
          {actionKeys.length > 0 ? (
            <ul
              className="list-disc space-y-1 rounded-input border border-border bg-surface-secondary/30 px-4 py-3 pl-8 text-sm text-text-secondary"
              data-testid="automation-run-now-action-list"
            >
              {actionKeys.map((key) => (
                <li key={key}>{copy.actions[key as AutomationLiveRunActionKey]}</li>
              ))}
            </ul>
          ) : (
            <p
              className="rounded-input border border-border bg-surface-secondary/30 px-4 py-3 text-sm text-text-secondary"
              data-testid="automation-run-now-no-actions"
            >
              {copy.noActions}
            </p>
          )}
        </div>

        <p className="text-xs text-text-muted">{copy.auditHint}</p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRunning}
            data-testid="automation-run-now-cancel"
          >
            {copy.cancel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isRunning}
            data-testid="automation-run-now-confirm"
          >
            {isRunning ? copy.confirming : copy.confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
