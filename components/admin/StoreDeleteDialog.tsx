"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDeleteStore } from "@/hooks/useStores";
import { toast } from "@/hooks/useToast";
import { formatDate } from "@/lib/utils/formatters";
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

interface StoreDeleteDialogProps {
  storeId: string | null;
  storeName: string;
  purgeAt?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: AdminContent;
  redirectAfterDelete?: string;
}

export function StoreDeleteDialog({
  storeId,
  storeName,
  purgeAt,
  open,
  onOpenChange,
  admin,
  redirectAfterDelete,
}: StoreDeleteDialogProps) {
  const copy = admin.accounts.deleteModal;
  const router = useRouter();
  const deleteMutation = useDeleteStore();

  const [nameConfirm, setNameConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const nameMatches = nameConfirm.trim() === storeName.trim();
  const canSubmit = nameMatches && password.length > 0 && !deleteMutation.isPending;

  useEffect(() => {
    if (!open) {
      setNameConfirm("");
      setPassword("");
      setSubmitError(null);
    }
  }, [open]);

  async function handleDelete() {
    if (!storeId || !canSubmit) return;
    setSubmitError(null);

    try {
      await deleteMutation.mutateAsync({
        storeId,
        payload: {
          storeNameConfirm: nameConfirm.trim(),
          password,
        },
      });

      toast({ title: copy.successTitle, description: copy.successDescription });
      onOpenChange(false);

      if (redirectAfterDelete) {
        router.push(redirectAfterDelete);
      }
    } catch (error) {
      let message: string = copy.genericError;
      if (error instanceof ApiError) {
        const bodyMessage = error.body.message?.trim();
        if (bodyMessage) message = bodyMessage;
        else if (error.status === 401) message = copy.wrongPassword;
        else if (error.status === 400) message = copy.nameMismatch;
      }
      setSubmitError(message);
      toast({ title: message });
    }
  }

  const purgeLabel = purgeAt ? formatDate(purgeAt) : copy.purgeFallback;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {copy.description.replace("{storeName}", storeName).replace("{purgeDate}", purgeLabel)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="delete-store-name-confirm">{copy.nameConfirmLabel}</Label>
            <Input
              id="delete-store-name-confirm"
              value={nameConfirm}
              onChange={(event) => setNameConfirm(event.target.value)}
              placeholder={storeName}
              autoComplete="off"
            />
            {nameConfirm.length > 0 && !nameMatches ? (
              <p className="text-xs text-status-error">{copy.nameMismatch}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-admin-password">{copy.passwordLabel}</Label>
            <Input
              id="delete-admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>

          {submitError ? (
            <p className="text-sm text-status-error" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {copy.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              disabled={!canSubmit}
              onClick={() => void handleDelete()}
            >
              {deleteMutation.isPending ? copy.deleting : copy.confirmDelete}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
