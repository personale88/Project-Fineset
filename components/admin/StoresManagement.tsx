"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { generateSecurePassword } from "@/lib/auth/generate-password";
import { getManagerLoginStatus } from "@/lib/api/stores";
import { createStoreSchema, type CreateStoreInput } from "@/lib/validations/store.schema";
import { useCreateStore, useStores } from "@/hooks/useStores";
import { AdminDashboardNav } from "@/components/admin/AdminDashboardNav";
import { StoreListCard } from "@/components/admin/StoreListCard";
import { toast } from "@/hooks/useToast";
import { ApiError } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { EmptyState } from "@/components/shared/EmptyState";
import type { Content } from "@/content/en";
import type { StoreCategory } from "@/types";

type AdminContent = Content["admin"];
type ErrorsContent = Content["errors"];

const defaultFormValues: CreateStoreInput = {
  name: "",
  category: "JEWELRY",
  city: "",
  state: "",
  pincode: "",
  businessOwnerName: "",
  businessOwnerEmail: "",
  password: "",
};

interface StoresManagementProps {
  admin: AdminContent;
  common: Content["common"];
  emptyMessage: string;
  errors: ErrorsContent;
  initialStores?: import("@/types").PaginatedResponse<{
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
    visits: number;
    revenue: number;
    conversionRate: number;
    createdAt: string;
  }>;
  initialStoresParams?: { page?: number; pageSize?: number };
}

export function StoresManagement({
  admin,
  common,
  emptyMessage,
  errors,
  initialStores,
  initialStoresParams,
}: StoresManagementProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const storesParams = {
    page: 1,
    pageSize: 50,
  };
  const { data, isLoading } = useStores(storesParams, {
    initialData: initialStores,
    initialParams: initialStoresParams ?? storesParams,
  });
  const createStoreMutation = useCreateStore();

  const form = useForm<CreateStoreInput>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: defaultFormValues,
  });

  const category = form.watch("category");
  const businessOwnerEmailValue = form.watch("businessOwnerEmail");
  const debouncedManagerEmail = useDebouncedValue(
    businessOwnerEmailValue?.trim().toLowerCase() ?? "",
    400,
  );
  const emailLooksValid =
    debouncedManagerEmail.length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debouncedManagerEmail);

  const { data: managerLoginStatus, isFetching: managerLoginChecking } = useQuery({
    queryKey: ["stores", "manager-login-status", debouncedManagerEmail],
    queryFn: () => getManagerLoginStatus(debouncedManagerEmail),
    enabled: modalOpen && emailLooksValid,
    staleTime: 30_000,
  });

  const managerHasExistingLogin = Boolean(managerLoginStatus?.hasExistingLogin);

  useEffect(() => {
    if (!managerHasExistingLogin) return;
    form.setValue("password", "");
    form.clearErrors("password");
  }, [managerHasExistingLogin, form]);

  function resetModalState() {
    form.reset(defaultFormValues);
    setSubmitError(null);
    setShowPassword(false);
    setCreatedCredentials(null);
  }

  function handleModalOpenChange(open: boolean) {
    setModalOpen(open);
    if (!open) {
      resetModalState();
    }
  }

  function handleSuggestPassword() {
    form.setValue("password", generateSecurePassword(), { shouldValidate: true });
  }

  function storeCreateErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      const message = error.body.message?.trim();
      if (message && message !== "Request failed") return message;

      if (error.status === 400 && error.body.details) {
        return "Check the form fields — one or more values are invalid.";
      }
      if (error.status === 503) {
        return "Database connection is temporarily unavailable. Fix Vercel DATABASE_URL and redeploy.";
      }
      if (error.status === 502) {
        return message || "Could not create store login. Check SUPABASE_SERVICE_ROLE_KEY on Vercel.";
      }
      if (error.status === 409) {
        return message || "This manager email is already registered.";
      }
      if (error.status === 500 && error.body.detail) {
        return `${message ?? "Server error"}: ${String(error.body.detail)}`;
      }
    }
    if (error instanceof Error && /failed to fetch|network/i.test(error.message)) {
      return "Cannot reach the server. Check your connection and try again.";
    }
    return errors.generic;
  }

  async function onSubmit(values: CreateStoreInput) {
    setSubmitError(null);
    const payload: CreateStoreInput = {
      ...values,
      password: managerHasExistingLogin ? undefined : values.password,
    };
    try {
      const result = await createStoreMutation.mutateAsync(payload);
      if (result.manager?.linkedExistingLogin) {
        toast({
          title: admin.stores.modal.createSuccessTitle,
          description: admin.stores.modal.linkedExistingManagerDescription,
        });
        handleModalOpenChange(false);
      } else if (result.manager && payload.password) {
        setCreatedCredentials({
          email: result.manager.email,
          password: payload.password,
        });
        toast({
          title: admin.stores.modal.createSuccessTitle,
          description: admin.stores.modal.createSuccessDescription,
        });
      } else {
        toast({ title: admin.stores.addStore, description: admin.stores.modal.title });
        handleModalOpenChange(false);
      }
    } catch (error) {
      const message = storeCreateErrorMessage(error);
      setSubmitError(message);
      toast({ title: message });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {admin.stores.title}
        </h1>
        <Button type="button" onClick={() => setModalOpen(true)}>
          {admin.stores.addStore}
        </Button>
      </div>

      <AdminDashboardNav labels={admin.nav} />

      {isLoading && !data ? (
        <div
          aria-live="polite"
          aria-busy="true"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-card" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <ul className="grid list-none gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.data.map((store) => (
            <li key={store.id}>
              <StoreListCard
                store={{
                  id: store.id,
                  name: store.name,
                  category: store.category as StoreCategory,
                  customCategory: store.customCategory,
                  city: store.city,
                  state: store.state,
                  pincode: store.pincode,
                  businessOwnerName: store.businessOwnerName,
                  businessOwnerEmail: store.businessOwnerEmail,
                  isActive: store.isActive,
                  deletedAt: store.deletedAt ?? null,
                  purgeAt: store.purgeAt ?? null,
                  staffCount: store.staffCount,
                }}
                storesCopy={admin.stores}
                categories={admin.categories}
                common={common}
                errors={errors}
                statusActiveLabel={admin.table.active}
                statusInactiveLabel={admin.table.inactive}
              />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={modalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{admin.stores.modal.title}</DialogTitle>
            {createdCredentials ? (
              <DialogDescription asChild>
                <div className="space-y-3 pt-2 text-left text-sm text-text-secondary">
                  <p>{admin.stores.modal.createSuccessDescription}</p>
                  <div className="space-y-2 rounded-md border border-border bg-surface-secondary p-3">
                    <p>
                      <span className="font-medium text-text-primary">Email: </span>
                      {createdCredentials.email}
                    </p>
                    <p>
                      <span className="font-medium text-text-primary">Password: </span>
                      <span className="font-mono">{createdCredentials.password}</span>
                    </p>
                  </div>
                  <p className="text-xs">{admin.stores.modal.passwordHint}</p>
                </div>
              </DialogDescription>
            ) : null}
          </DialogHeader>

          {createdCredentials ? (
            <Button
              type="button"
              className="w-full"
              onClick={() => handleModalOpenChange(false)}
            >
              Done
            </Button>
          ) : (
            <Form {...form}>
              <form
                onSubmit={(event) => {
                  setSubmitError(null);
                  void form.handleSubmit(onSubmit)(event);
                }}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{admin.stores.modal.nameLabel}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={admin.stores.modal.namePlaceholder}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{admin.stores.modal.categoryLabel}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(admin.categories).map(([key, label]) => (
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
                {category === "OTHER" && (
                  <FormField
                    control={form.control}
                    name="customCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{admin.stores.modal.customCategoryLabel}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={admin.stores.modal.customCategoryPlaceholder}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{admin.stores.modal.cityLabel}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={admin.stores.modal.cityPlaceholder}
                        />
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
                      <FormLabel>{admin.stores.modal.stateLabel}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={admin.stores.modal.statePlaceholder}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{admin.stores.modal.pincodeLabel}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder={admin.stores.modal.pincodePlaceholder}
                        />
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
                      <FormLabel>{admin.stores.modal.businessOwnerNameLabel}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={admin.stores.modal.businessOwnerNamePlaceholder}
                        />
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
                      <FormLabel>{admin.stores.modal.businessOwnerEmailLabel}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          autoComplete="email"
                          placeholder={admin.stores.modal.businessOwnerEmailPlaceholder}
                        />
                      </FormControl>
                      {managerHasExistingLogin ? (
                        <p className="text-xs text-status-success" role="status">
                          {admin.stores.modal.existingManagerHint}
                        </p>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!managerHasExistingLogin ? (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between gap-2">
                          <FormLabel>{admin.stores.modal.passwordLabel}</FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 py-1 text-xs text-brand-gold"
                            onClick={handleSuggestPassword}
                            disabled={managerLoginChecking}
                          >
                            <Sparkles className="mr-1 size-3.5" aria-hidden="true" />
                            {admin.stores.modal.suggestPassword}
                          </Button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              autoComplete="new-password"
                              placeholder={admin.stores.modal.passwordPlaceholder}
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
                        <p className="text-xs text-text-muted">
                          {admin.stores.modal.passwordHint}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
                {submitError && (
                  <p className="text-sm text-status-error" role="alert">
                    {submitError}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createStoreMutation.isPending}
                >
                  {admin.stores.addStore}
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
