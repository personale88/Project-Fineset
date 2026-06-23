"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { generateSecurePassword } from "@/lib/auth/generate-password";
import {
  useResetStoreManagerPassword,
  useStoreDetail,
  useUpdateStore,
} from "@/hooks/useStores";
import { toast } from "@/hooks/useToast";
import { toDateInputValue } from "@/lib/utils/date-input";
import {
  editStoreSchema,
  type EditStoreInput,
  type UpdateStoreInput,
} from "@/lib/validations/store.schema";
import { passwordPolicySchema } from "@/lib/auth/password-policy";
import { ApiError } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { StoreCategorySelect } from "@/components/admin/StoreCategorySelect";
import {
  storeCategoryChoiceToFormValue,
  storeCategoryFormValueToChoice,
} from "@/lib/store-category/catalog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Content } from "@/content/en";

type AdminContent = Content["admin"];

interface StoreEditDialogProps {
  storeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: AdminContent;
  onUpdated?: () => void;
}

function mapEditToUpdate(values: EditStoreInput, isActive: boolean): UpdateStoreInput {
  return {
    name: values.name,
    category: values.category,
    customCategory: values.category === "OTHER" ? values.customCategory ?? null : null,
    city: values.city,
    state: values.state,
    pincode: values.pincode ?? null,
    businessOwnerName: values.businessOwnerName,
    businessOwnerEmail: values.businessOwnerEmail ?? null,
    dataExpiryAt: (values.dataExpiryAt?.trim() ? values.dataExpiryAt : null) as UpdateStoreInput["dataExpiryAt"],
    renewalDueAt: (values.renewalDueAt?.trim() ? values.renewalDueAt : null) as UpdateStoreInput["renewalDueAt"],
    isActive,
  };
}

export function StoreEditDialog({
  storeId,
  open,
  onOpenChange,
  admin,
  onUpdated,
}: StoreEditDialogProps) {
  const copy = admin.accounts.editModal;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [categoryKey, setCategoryKey] = useState("JEWELRY");
  const [resetPassword, setResetPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { data: store, isLoading, isError, refetch } = useStoreDetail(storeId, open);
  const updateMutation = useUpdateStore();
  const passwordMutation = useResetStoreManagerPassword();

  const form = useForm<EditStoreInput>({
    resolver: zodResolver(editStoreSchema),
    defaultValues: {
      name: "",
      category: "JEWELRY",
      city: "",
      state: "",
      pincode: "",
      businessOwnerName: "",
      businessOwnerEmail: "",
      dataExpiryAt: "",
      renewalDueAt: "",
    },
  });

  const formSyncKey = open && store ? store.id : null;
  const [prevFormSyncKey, setPrevFormSyncKey] = useState<string | null>(null);
  if (formSyncKey !== prevFormSyncKey) {
    setPrevFormSyncKey(formSyncKey);
    if (store && open) {
      const choice = storeCategoryFormValueToChoice({
        category: store.category,
        customCategory: store.customCategory,
      });
      setCategoryKey(choice);
      setIsActive(store.isActive);
      setResetPassword("");
      setSubmitError(null);
    }
  }

  useEffect(() => {
    if (!store || !open) return;
    form.reset({
      name: store.name,
      category: store.category,
      customCategory: store.customCategory ?? undefined,
      city: store.city,
      state: store.state,
      pincode: store.pincode ?? "",
      businessOwnerName: store.businessOwnerName ?? "",
      businessOwnerEmail: store.businessOwnerEmail ?? "",
      dataExpiryAt: toDateInputValue(store.dataExpiryAt),
      renewalDueAt: toDateInputValue(store.renewalDueAt),
    });
  }, [formSyncKey, store, open, form]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSubmitError(null);
      setResetPassword("");
    }
    onOpenChange(next);
  }

  async function onSubmit(values: EditStoreInput) {
    if (!storeId) return;
    setSubmitError(null);

    const passwordTrimmed = resetPassword.trim();
    if (passwordTrimmed) {
      const policy = passwordPolicySchema.safeParse(passwordTrimmed);
      if (!policy.success) {
        setSubmitError(copy.passwordPolicyError);
        return;
      }
    }

    try {
      const categoryFields = storeCategoryChoiceToFormValue(categoryKey);
      await updateMutation.mutateAsync({
        storeId,
        payload: mapEditToUpdate(
          {
            ...values,
            category: categoryFields.category,
            customCategory: categoryFields.customCategory ?? undefined,
          },
          isActive,
        ),
      });

      if (passwordTrimmed) {
        await passwordMutation.mutateAsync({
          storeId,
          payload: { password: passwordTrimmed },
        });
      }

      toast({
        title: copy.successTitle,
        description: passwordTrimmed ? copy.successWithPassword : copy.successDescription,
      });
      onUpdated?.();
      handleOpenChange(false);
    } catch (error) {
      let message: string = copy.genericError;
      if (error instanceof ApiError) {
        const bodyMessage = error.body.message?.trim();
        if (bodyMessage) message = bodyMessage;
        else if (error.status === 409) message = copy.emailConflict;
        else if (error.status === 404) message = copy.notFound;
      }
      setSubmitError(message);
      toast({ title: message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3" aria-live="polite">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError || !store ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-status-error">{copy.loadFailed}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
              {admin.overview.retry}
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={(event) => {
                void form.handleSubmit(onSubmit)(event);
              }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between rounded-input border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">{copy.activeLabel}</p>
                  <p className="text-xs text-text-muted">{copy.activeHint}</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} aria-label={copy.activeLabel} />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{admin.accounts.modal.nameLabel}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <StoreCategorySelect
                label={admin.accounts.modal.categoryLabel}
                field={{
                  value: categoryKey,
                  onChange: (value: string) => setCategoryKey(value),
                  onBlur: () => undefined,
                  name: "categoryKey",
                  ref: () => undefined,
                }}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{admin.accounts.modal.cityLabel}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{admin.accounts.modal.stateLabel}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{admin.accounts.modal.pincodeLabel}</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="numeric" maxLength={6} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessOwnerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{admin.accounts.modal.businessOwnerNameLabel}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessOwnerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{admin.accounts.modal.businessOwnerEmailLabel}</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" autoComplete="email" />
                    </FormControl>
                    <FormDescription>{copy.emailSyncHint}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="dataExpiryAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{admin.accounts.modal.dataExpiryLabel}</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="renewalDueAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{admin.accounts.modal.renewalDueLabel}</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2 rounded-input border border-border p-3">
                <p className="text-sm font-medium text-text-primary">{copy.passwordSectionTitle}</p>
                <p className="text-xs text-text-muted">{copy.passwordSectionHint}</p>
                <div className="flex gap-2">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={resetPassword}
                    onChange={(event) => setResetPassword(event.target.value)}
                    placeholder={copy.passwordPlaceholder}
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setResetPassword(generateSecurePassword())}
                    aria-label={admin.accounts.modal.suggestPassword}
                  >
                    <Sparkles className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>

              {submitError ? (
                <p className="text-sm text-status-error" role="alert">
                  {submitError}
                </p>
              ) : null}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleOpenChange(false)}
                >
                  {copy.cancel}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={updateMutation.isPending || passwordMutation.isPending}
                >
                  {updateMutation.isPending ? copy.saving : copy.save}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
