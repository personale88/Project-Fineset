"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, MoreHorizontal, Sparkles } from "lucide-react";
import { generateSecurePassword } from "@/lib/auth/generate-password";
import {
  editStoreSchema,
  type EditStoreInput,
  type UpdateStoreInput,
} from "@/lib/validations/store.schema";
import { updateStoreManagerPasswordSchema } from "@/lib/validations/store-password.schema";
import {
  useDeleteStore,
  useRestoreStore,
  useUpdateStore,
  useUpdateStoreManagerPassword,
} from "@/hooks/useStores";
import { toast } from "@/hooks/useToast";
import { ApiError } from "@/types";
import type { Content } from "@/content/en";
import type { StoreCategory } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AdminStoresContent = Content["admin"]["stores"];
type AdminCategories = Content["admin"]["categories"];
type ErrorsContent = Content["errors"];
type CommonContent = Content["common"];

export interface StoreTableRow {
  id: string;
  name: string;
  category: StoreCategory;
  customCategory?: string | null;
  city: string;
  state: string;
  pincode?: string | null;
  businessOwnerName?: string | null;
  businessOwnerEmail?: string | null;
  isActive: boolean;
  deletedAt?: string | null;
  purgeAt?: string | null;
  staffCount: number;
}

interface StoreTableRowMenuProps {
  store: StoreTableRow;
  storesCopy: AdminStoresContent;
  categories: AdminCategories;
  common: CommonContent;
  errors: ErrorsContent;
}

function toUpdatePayload(values: EditStoreInput): UpdateStoreInput {
  return {
    name: values.name,
    category: values.category,
    city: values.city,
    state: values.state,
    pincode: values.pincode ?? null,
    businessOwnerName: values.businessOwnerName ?? null,
    businessOwnerEmail: values.businessOwnerEmail ?? null,
    customCategory: values.category === "OTHER" ? (values.customCategory ?? null) : null,
  };
}

function storeToEditDefaults(store: StoreTableRow): EditStoreInput {
  return {
    name: store.name,
    category: store.category,
    customCategory: store.customCategory ?? undefined,
    city: store.city,
    state: store.state,
    pincode: store.pincode ?? "",
    businessOwnerName: store.businessOwnerName ?? "",
    businessOwnerEmail: store.businessOwnerEmail ?? "",
  };
}

export function StoreTableRowMenu({
  store,
  storesCopy,
  categories,
  common,
  errors,
}: StoreTableRowMenuProps) {
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteNameConfirm, setDeleteNameConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [ownershipConfirmOpen, setOwnershipConfirmOpen] = useState(false);
  const [pendingEditValues, setPendingEditValues] = useState<EditStoreInput | null>(
    null,
  );
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateStoreMutation = useUpdateStore();
  const deleteStoreMutation = useDeleteStore();
  const restoreStoreMutation = useRestoreStore();
  const updatePasswordMutation = useUpdateStoreManagerPassword();

  const isMutating =
    updateStoreMutation.isPending ||
    deleteStoreMutation.isPending ||
    restoreStoreMutation.isPending ||
    updatePasswordMutation.isPending;

  const editForm = useForm<EditStoreInput>({
    resolver: zodResolver(editStoreSchema),
    defaultValues: storeToEditDefaults(store),
  });

  const passwordForm = useForm<{ password: string }>({
    resolver: zodResolver(updateStoreManagerPasswordSchema),
    defaultValues: { password: "" },
  });

  const editCategory = editForm.watch("category");

  function openEditDialog() {
    editForm.reset(storeToEditDefaults(store));
    setSubmitError(null);
    setEditOpen(true);
  }

  function apiErrorMessage(error: unknown, fallback: string) {
    return error instanceof ApiError ? (error.body.message ?? fallback) : fallback;
  }

  function handleSuggestPassword() {
    passwordForm.setValue("password", generateSecurePassword(), { shouldValidate: true });
  }

  async function handleConfirmStatusChange() {
    try {
      await updateStoreMutation.mutateAsync({
        storeId: store.id,
        payload: { isActive: !store.isActive },
      });
      toast({ title: storesCopy.statusUpdated });
      setStatusConfirmOpen(false);
    } catch (error) {
      toast({ title: apiErrorMessage(error, errors.generic) });
    }
  }

  function resetDeleteForm() {
    setDeletePassword("");
    setDeleteNameConfirm("");
    setDeleteError(null);
  }

  async function handleConfirmDelete() {
    setDeleteError(null);
    const nameConfirm = deleteNameConfirm.trim();
    if (nameConfirm !== store.name.trim()) {
      setDeleteError(storesCopy.deleteConfirm.storeNameMismatch);
      return;
    }
    if (!deletePassword) {
      setDeleteError(storesCopy.deleteConfirm.adminPasswordLabel);
      return;
    }

    try {
      await deleteStoreMutation.mutateAsync({
        storeId: store.id,
        payload: {
          password: deletePassword,
          storeNameConfirm: nameConfirm,
        },
      });
      toast({ title: storesCopy.deleted });
      setDeleteConfirmOpen(false);
      resetDeleteForm();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setDeleteError(storesCopy.deleteConfirm.wrongPassword);
          return;
        }
        if (error.status === 400) {
          const msg = error.body.message?.trim();
          setDeleteError(msg || storesCopy.deleteConfirm.storeNameMismatch);
          return;
        }
      }
      const message = apiErrorMessage(error, errors.generic);
      toast({ title: message || storesCopy.deleteBlocked });
    }
  }

  async function submitEdit(values: EditStoreInput) {
    setSubmitError(null);
    try {
      await updateStoreMutation.mutateAsync({
        storeId: store.id,
        payload: toUpdatePayload(values),
      });
      toast({ title: storesCopy.updated });
      setEditOpen(false);
      setOwnershipConfirmOpen(false);
      setPendingEditValues(null);
    } catch (error) {
      const message = apiErrorMessage(error, errors.generic);
      setSubmitError(message);
      toast({ title: message });
    }
  }

  async function handleEditSubmit(values: EditStoreInput) {
    const nextEmail = values.businessOwnerEmail?.trim().toLowerCase() ?? "";
    const currentEmail = store.businessOwnerEmail?.trim().toLowerCase() ?? "";
    if (nextEmail && nextEmail !== currentEmail) {
      setPendingEditValues(values);
      setOwnershipConfirmOpen(true);
      return;
    }
    await submitEdit(values);
  }

  async function handleConfirmOwnershipTransfer() {
    if (!pendingEditValues) return;
    await submitEdit(pendingEditValues);
  }

  async function handlePasswordSubmit(values: { password: string }) {
    setSubmitError(null);
    try {
      await updatePasswordMutation.mutateAsync({
        storeId: store.id,
        password: values.password,
      });
      toast({ title: storesCopy.passwordUpdated });
      passwordForm.reset({ password: "" });
      setShowPassword(false);
      setPasswordOpen(false);
    } catch (error) {
      const message = apiErrorMessage(error, errors.generic);
      setSubmitError(message);
      toast({ title: message });
    }
  }

  const statusConfirmCopy = store.isActive
    ? storesCopy.inactiveConfirm
    : storesCopy.activeConfirm;

  return (
    <>
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={isMutating}
              aria-label={storesCopy.actions.menu}
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={isMutating} onSelect={openEditDialog}>
              {storesCopy.actions.edit}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isMutating}
              onSelect={() => setStatusConfirmOpen(true)}
            >
              {store.isActive
                ? storesCopy.actions.makeInactive
                : storesCopy.actions.makeActive}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isMutating}
              onSelect={() => {
                setSubmitError(null);
                passwordForm.reset({ password: "" });
                setShowPassword(false);
                setPasswordOpen(true);
              }}
            >
              {storesCopy.actions.updatePassword}
            </DropdownMenuItem>
            {store.deletedAt ? (
              <DropdownMenuItem
                disabled={isMutating}
                onSelect={() => {
                  void restoreStoreMutation
                    .mutateAsync(store.id)
                    .then(() => toast({ title: storesCopy.restored }))
                    .catch((err: unknown) => {
                      const message =
                        err instanceof ApiError ? err.message : storesCopy.deleteBlocked;
                      toast({ title: message });
                    });
                }}
              >
                {storesCopy.actions.restore}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isMutating || Boolean(store.deletedAt)}
              className="text-status-error focus:text-status-error"
              onSelect={() => setDeleteConfirmOpen(true)}
            >
              {storesCopy.actions.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{statusConfirmCopy.title}</DialogTitle>
            <DialogDescription>
              {statusConfirmCopy.description.replace("{name}", store.name)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isMutating}
              onClick={() => setStatusConfirmOpen(false)}
            >
              {statusConfirmCopy.cancel}
            </Button>
            <Button
              type="button"
              disabled={isMutating}
              onClick={() => void handleConfirmStatusChange()}
            >
              {statusConfirmCopy.confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open) resetDeleteForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{storesCopy.deleteConfirm.title}</DialogTitle>
            <DialogDescription>
              {storesCopy.deleteConfirm.description.replace("{name}", store.name)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-text-muted">{storesCopy.deleteConfirm.graceNote}</p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary" htmlFor={`delete-name-${store.id}`}>
                {storesCopy.deleteConfirm.storeNameLabel}
              </label>
              <Input
                id={`delete-name-${store.id}`}
                value={deleteNameConfirm}
                onChange={(e) => setDeleteNameConfirm(e.target.value)}
                placeholder={store.name}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary" htmlFor={`delete-pw-${store.id}`}>
                {storesCopy.deleteConfirm.adminPasswordLabel}
              </label>
              <Input
                id={`delete-pw-${store.id}`}
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder={storesCopy.deleteConfirm.adminPasswordPlaceholder}
                autoComplete="current-password"
              />
            </div>
            {deleteError ? (
              <p className="text-sm text-status-error">{deleteError}</p>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isMutating}
              onClick={() => setDeleteConfirmOpen(false)}
            >
              {storesCopy.deleteConfirm.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isMutating}
              onClick={() => void handleConfirmDelete()}
            >
              {storesCopy.deleteConfirm.confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={passwordOpen}
        onOpenChange={(open) => {
          setPasswordOpen(open);
          if (!open) {
            setShowPassword(false);
            setSubmitError(null);
            passwordForm.reset({ password: "" });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{storesCopy.passwordModal.title}</DialogTitle>
            <DialogDescription>
              {storesCopy.passwordModal.description.replace("{name}", store.name)}
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
              className="space-y-4"
            >
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>{storesCopy.modal.passwordLabel}</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1 text-xs text-brand-gold"
                        onClick={handleSuggestPassword}
                      >
                        <Sparkles className="mr-1 size-3.5" aria-hidden="true" />
                        {storesCopy.modal.suggestPassword}
                      </Button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder={storesCopy.modal.passwordPlaceholder}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword((value) => !value)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="size-4 text-text-muted" aria-hidden="true" />
                          ) : (
                            <Eye className="size-4 text-text-muted" aria-hidden="true" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <p className="text-xs text-text-muted">{storesCopy.modal.passwordHint}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {submitError && (
                <p className="text-sm text-status-error" role="alert">
                  {submitError}
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isMutating}
                  onClick={() => setPasswordOpen(false)}
                >
                  {storesCopy.passwordModal.cancel}
                </Button>
                <Button type="submit" disabled={isMutating}>
                  {storesCopy.passwordModal.confirm}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setSubmitError(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{storesCopy.editModal.title}</DialogTitle>
            <DialogDescription>{store.name}</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{storesCopy.modal.nameLabel}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={storesCopy.modal.namePlaceholder}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{storesCopy.modal.categoryLabel}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(categories).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {editCategory === "OTHER" ? (
                <FormField
                  control={editForm.control}
                  name="customCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{storesCopy.modal.customCategoryLabel}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={storesCopy.modal.customCategoryPlaceholder}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
              <FormField
                control={editForm.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{storesCopy.modal.cityLabel}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={storesCopy.modal.cityPlaceholder}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{storesCopy.modal.stateLabel}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={storesCopy.modal.statePlaceholder}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{storesCopy.modal.pincodeLabel}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="numeric"
                        maxLength={6}
                        placeholder={storesCopy.modal.pincodePlaceholder}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="businessOwnerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{storesCopy.modal.businessOwnerNameLabel}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={storesCopy.modal.businessOwnerNamePlaceholder}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="businessOwnerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{storesCopy.modal.businessOwnerEmailLabel}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        autoComplete="email"
                        placeholder={storesCopy.modal.businessOwnerEmailPlaceholder}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {submitError && (
                <p className="text-sm text-status-error" role="alert">
                  {submitError}
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isMutating}
                  onClick={() => setEditOpen(false)}
                >
                  {common.cancel}
                </Button>
                <Button type="submit" disabled={isMutating}>
                  {storesCopy.editModal.save}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={ownershipConfirmOpen} onOpenChange={setOwnershipConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{storesCopy.ownershipTransfer.title}</DialogTitle>
            <DialogDescription>
              {storesCopy.ownershipTransfer.description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isMutating}
              onClick={() => {
                setOwnershipConfirmOpen(false);
                setPendingEditValues(null);
              }}
            >
              {common.cancel}
            </Button>
            <Button
              type="button"
              disabled={isMutating}
              onClick={() => void handleConfirmOwnershipTransfer()}
            >
              {storesCopy.ownershipTransfer.confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
