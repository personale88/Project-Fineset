"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StoreCategoryChoice } from "@/lib/store-category/catalog";
import type { Content } from "@/content/en";

type CategoryCopy = Content["admin"]["settings"]["categories"];

interface StoreCategoryEditDialogProps {
  copy: CategoryCopy;
  category: StoreCategoryChoice | null;
  open: boolean;
  saving: boolean;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: { name: string; label: string; newName?: string }) => void;
  onDelete: (category: StoreCategoryChoice) => void;
}

export function StoreCategoryEditDialog({
  copy,
  category,
  open,
  saving,
  deleting,
  onOpenChange,
  onSave,
  onDelete,
}: StoreCategoryEditDialogProps) {
  const [label, setLabel] = useState("");
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!category || !open) return;
    setLabel(category.label);
    setNewName(category.isBuiltin ? "" : category.name);
  }, [category, open]);

  function handleSave() {
    if (!category) return;
    onSave({
      name: category.name,
      label: label.trim(),
      newName: category.isBuiltin ? undefined : newName.trim(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.editTitle}</DialogTitle>
          <DialogDescription>
            {category?.isBuiltin ? copy.editBuiltinDescription : copy.editCustomDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-label">{copy.displayLabel}</Label>
            <Input
              id="category-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={copy.displayLabelPlaceholder}
            />
          </div>

          {!category?.isBuiltin ? (
            <div className="space-y-2">
              <Label htmlFor="category-key">{copy.internalName}</Label>
              <Input
                id="category-key"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder={copy.namePlaceholder}
              />
              <p className="text-xs text-text-muted">{copy.internalNameHint}</p>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="border-status-error/40 text-status-error hover:bg-status-error/10 hover:text-status-error"
              disabled={deleting || saving || !category}
              onClick={() => category && onDelete(category)}
            >
              {deleting ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="mr-2 size-4" aria-hidden />
              )}
              {copy.deleteFromEdit}
            </Button>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {copy.cancel}
              </Button>
              <Button
                type="button"
                disabled={saving || deleting || !label.trim() || (!category?.isBuiltin && !newName.trim())}
                onClick={handleSave}
              >
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
                {copy.save}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
