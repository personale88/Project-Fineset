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
import { useCreateStore } from "@/hooks/useStores";
import { AdminPortfolioList } from "@/components/admin/overview/AdminPortfolioList";
import { DeletedStoresList } from "@/components/admin/DeletedStoresList";
import {
  AccountsMobileScopeNav,
  AccountsSidePanel,
  AccountsResultsHeader,
  scopeMeta,
  type AccountsScope,
} from "@/components/admin/accounts/AccountsSidePanel";
import { AddInternalTeamDialog } from "@/components/admin/accounts/AddInternalTeamDialog";
import { InternalTeamPane } from "@/components/admin/accounts/InternalTeamPane";
import { useAdminPortal } from "@/components/admin/AdminPortalContext";
import { usePlatformSettingsContext } from "@/components/admin/PlatformSettingsProvider";
import { computeOnboardingDefaultDates } from "@/lib/platform/onboarding-dates";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { ApiError } from "@/types";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { StoreCategorySelect } from "@/components/admin/StoreCategorySelect";
import { storeCategoryChoiceToFormValue } from "@/lib/store-category/catalog";
import type { Content } from "@/content/en";
import type { AdminDashboardOverview } from "@/types";
import {
  ADMIN_SCOPED_CONTENT_CARD_CLASS,
  ADMIN_SCOPED_CONTENT_SCROLL_CLASS,
  ADMIN_SCOPED_PAGE_ROOT_CLASS,
} from "@/lib/admin/admin-scoped-page-layout";

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
  dataExpiryAt: "",
  renewalDueAt: "",
};

interface AdminAccountsManagementProps {
  admin: AdminContent;
  errors: ErrorsContent;
  initialOverview?: AdminDashboardOverview;
  initialOverviewFailed?: boolean;
}

export function AdminAccountsManagement({
  admin,
  errors,
  initialOverview,
  initialOverviewFailed = false,
}: AdminAccountsManagementProps) {
  const { role } = useAdminPortal();
  const { settings: platformSettings } = usePlatformSettingsContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [internalTeamModalOpen, setInternalTeamModalOpen] = useState(false);
  const [scope, setScope] = useState<AccountsScope>("clients");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const createStoreMutation = useCreateStore();

  const form = useForm<CreateStoreInput>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: defaultFormValues,
  });

  const [categoryKey, setCategoryKey] = useState("JEWELRY");
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

  const { setValue, clearErrors } = form;

  useEffect(() => {
    if (!managerHasExistingLogin) return;
    setValue("password", "");
    clearErrors("password");
  }, [managerHasExistingLogin, setValue, clearErrors]);

  function buildCreateStoreDefaults(): CreateStoreInput {
    const dates = computeOnboardingDefaultDates(platformSettings.onboarding);
    return {
      ...defaultFormValues,
      dataExpiryAt: dates.dataExpiryAt,
      renewalDueAt: dates.renewalDueAt,
    };
  }

  function resetModalState() {
    form.reset(buildCreateStoreDefaults());
    setCategoryKey("JEWELRY");
    setSubmitError(null);
    setShowPassword(false);
    setCreatedCredentials(null);
  }

  function handleOpenCreateModal() {
    form.reset(buildCreateStoreDefaults());
    setCategoryKey("JEWELRY");
    setSubmitError(null);
    setShowPassword(false);
    setCreatedCredentials(null);
    setModalOpen(true);
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
    const categoryFields = storeCategoryChoiceToFormValue(categoryKey);
    const payload: CreateStoreInput = {
      ...values,
      ...categoryFields,
      customCategory: categoryFields.customCategory ?? undefined,
      password: managerHasExistingLogin ? undefined : values.password,
    };
    try {
      const result = await createStoreMutation.mutateAsync(payload);
      if (result.manager?.linkedExistingLogin) {
        toast({
          title: admin.accounts.modal.createSuccessTitle,
          description: admin.accounts.modal.linkedExistingManagerDescription,
        });
        handleModalOpenChange(false);
      } else if (result.manager && payload.password) {
        setCreatedCredentials({
          email: result.manager.email,
          password: payload.password,
        });
        toast({
          title: admin.accounts.modal.createSuccessTitle,
          description: admin.accounts.modal.createSuccessDescription,
        });
      } else {
        toast({ title: admin.accounts.addStore, description: admin.accounts.modal.title });
        handleModalOpenChange(false);
      }
    } catch (error) {
      const message = storeCreateErrorMessage(error);
      setSubmitError(message);
      toast({ title: message });
    }
  }

  const showInternalTeam = role === "MASTER_ADMIN";
  const canInviteInternal = role === "MASTER_ADMIN";
  const { title: scopeTitle, description: scopeDescription } = scopeMeta(admin.accounts, scope);

  const headerAction =
    scope === "clients" ? (
      <Button type="button" className="w-full sm:w-auto" onClick={handleOpenCreateModal}>
        {admin.accounts.addStore}
      </Button>
    ) : scope === "internal" && canInviteInternal ? (
      <Button type="button" className="w-full sm:w-auto" onClick={() => setInternalTeamModalOpen(true)}>
        {admin.accounts.internalTeam.addButton}
      </Button>
    ) : null;

  return (
    <>
      <AccountsSidePanel
        copy={admin.accounts}
        value={scope}
        onChange={setScope}
        showInternal={showInternalTeam}
        pageMeta={admin.portfolio.periodHint}
      />

      <div className={ADMIN_SCOPED_PAGE_ROOT_CLASS} data-testid="accounts-center-root">
        <AccountsMobileScopeNav
          copy={admin.accounts}
          value={scope}
          onChange={setScope}
          showInternal={showInternalTeam}
        />

        <section
          className={ADMIN_SCOPED_CONTENT_CARD_CLASS}
          role="tabpanel"
          aria-label={scopeTitle}
          data-testid="accounts-center-content"
        >
          <AccountsResultsHeader
            title={scopeTitle}
            description={scopeDescription}
            action={headerAction ?? undefined}
          />

          <div
            className={cn(ADMIN_SCOPED_CONTENT_SCROLL_CLASS, "px-4 sm:px-5")}
            data-testid="accounts-center-scroll"
          >
            <div className="min-w-0 pt-4">
              {scope === "clients" ? (
                <AdminPortfolioList
                  admin={admin}
                  initialOverview={initialOverview}
                  initialOverviewFailed={initialOverviewFailed}
                />
              ) : scope === "deleted" ? (
                <DeletedStoresList admin={admin} />
              ) : (
                <InternalTeamPane copy={admin.accounts.internalTeam} />
              )}
            </div>
          </div>
        </section>
      </div>

      <Dialog open={modalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{admin.accounts.modal.title}</DialogTitle>
            {createdCredentials ? (
              <DialogDescription asChild>
                <div className="space-y-3 pt-2 text-left text-sm text-text-secondary">
                  <p>{admin.accounts.modal.createSuccessDescription}</p>
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
                  <p className="text-xs">{admin.accounts.modal.passwordHint}</p>
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
                      <FormLabel>{admin.accounts.modal.nameLabel}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={admin.accounts.modal.namePlaceholder}
                        />
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
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{admin.accounts.modal.cityLabel}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={admin.accounts.modal.cityPlaceholder}
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
                      <FormLabel>{admin.accounts.modal.stateLabel}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={admin.accounts.modal.statePlaceholder}
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
                      <FormLabel>{admin.accounts.modal.pincodeLabel}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder={admin.accounts.modal.pincodePlaceholder}
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
                      <FormLabel>{admin.accounts.modal.businessOwnerNameLabel}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={admin.accounts.modal.businessOwnerNamePlaceholder}
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
                      <FormLabel>{admin.accounts.modal.businessOwnerEmailLabel}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          autoComplete="email"
                          placeholder={admin.accounts.modal.businessOwnerEmailPlaceholder}
                        />
                      </FormControl>
                      {managerHasExistingLogin ? (
                        <p className="text-xs text-status-success" role="status">
                          {admin.accounts.modal.existingManagerHint}
                        </p>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dataExpiryAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{admin.accounts.modal.dataExpiryLabel}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                        />
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
                        <Input
                          {...field}
                          type="date"
                        />
                      </FormControl>
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
                          <FormLabel>{admin.accounts.modal.passwordLabel}</FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 py-1 text-xs text-brand-gold"
                            onClick={handleSuggestPassword}
                            disabled={managerLoginChecking}
                          >
                            <Sparkles className="mr-1 size-3.5" aria-hidden="true" />
                            {admin.accounts.modal.suggestPassword}
                          </Button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              autoComplete="new-password"
                              placeholder={admin.accounts.modal.passwordPlaceholder}
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
                          {admin.accounts.modal.passwordHint}
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
                  {admin.accounts.addStore}
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <AddInternalTeamDialog
        copy={admin.accounts.internalTeam}
        open={internalTeamModalOpen}
        onOpenChange={setInternalTeamModalOpen}
        errors={errors}
      />
    </>
  );
}
