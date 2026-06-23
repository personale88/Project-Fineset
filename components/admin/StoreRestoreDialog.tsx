"use client";

import { useState } from "react";
import { useRestoreStore } from "@/hooks/useStores";
import { toast } from "@/hooks/useToast";
import { ApiError } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Content } from "@/content/en";

type AdminContent = Content["admin"];

interface StoreRestoreDialogProps {
  storeId: string | null;
  storeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: AdminContent;
}

export function StoreRestoreDialog({
  storeId,
  storeName,
  open,
  onOpenChange,
  admin,
}: StoreRestoreDialogProps) {
  const copy = admin.accounts.restoreModal;
  const restoreMutation = useRestoreStore();
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canSubmit = password.length > 0 && !restoreMutation.isPending;

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setPassword("");
      setSubmitError(null);
    }
  }

  async function handleRestore() {
    if (!storeId || !canSubmit) return;
    setSubmitError(null);

    try {
      await restoreMutation.mutateAsync({
        storeId,
        payload: { password },
      });

      toast({
        title: admin.accounts.deletedList.restoreSuccessTitle,
        description: admin.accounts.deletedList.restoreSuccessDescription.replace(
          "{storeName}",
          storeName,
        ),
      });
      onOpenChange(false);
    } catch (error) {
      let message: string = copy.genericError;
      if (error instanceof ApiError) {
        const bodyMessage = error.body.message?.trim();
        if (bodyMessage) message = bodyMessage;
      }
      setSubmitError(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {copy.description.replace("{storeName}", storeName)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="restore-admin-password">{copy.passwordLabel}</Label>
            <Input
              id="restore-admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {submitError ? (
            <p className="text-sm text-status-error" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {copy.cancel}
            </Button>
            <Button type="button" disabled={!canSubmit} onClick={() => void handleRestore()}>
              {restoreMutation.isPending ? copy.submitting : copy.submit}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
