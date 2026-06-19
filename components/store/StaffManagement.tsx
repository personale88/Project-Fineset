"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, EyeOff, MoreHorizontal, Sparkles, Upload } from "lucide-react";
import {
  createStaffSchema,
  editStaffSchema,
  type CreateStaffInput,
  type EditStaffInput,
} from "@/lib/validations/staff.schema";
import { generateSecurePassword } from "@/lib/auth/generate-password";
import {
  useCreateStaff,
  useDeleteStaff,
  useImportStaffCsv,
  useStoreStaff,
  useUpdateStaff,
} from "@/hooks/useStaff";
import { toast } from "@/hooks/useToast";
import { formatDate } from "@/lib/utils/formatters";
import { ApiError } from "@/types";
import { Badge } from "@/components/ui/badge";
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
import { EmptyState } from "@/components/shared/EmptyState";
import type { Content } from "@/content/en";

type StoreContent = Content["store"];
type ErrorsContent = Content["errors"];
type StaffListItem = NonNullable<StaffManagementProps["initialStaff"]>[number];

interface StaffManagementProps {
  store: StoreContent;
  storeId: string;
  emptyMessage: string;
  errors: ErrorsContent;
  initialStaff?: Awaited<ReturnType<typeof import("@/lib/api/staff").getStaff>>;
  backHref?: string;
  backLabel?: string;
  readOnly?: boolean;
  showImport?: boolean;
}

export function StaffManagement({
  store,
  storeId,
  emptyMessage,
  errors,
  initialStaff,
  backHref,
  backLabel,
  readOnly = false,
  showImport = false,
}: StaffManagementProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffListItem | null>(null);
  const [staffToEdit, setStaffToEdit] = useState<StaffListItem | null>(null);
  const [editSubmitError, setEditSubmitError] = useState<string | null>(null);

  const { data, isLoading } = useStoreStaff(storeId, { initialData: initialStaff });
  const createStaffMutation = useCreateStaff(storeId);
  const importStaffMutation = useImportStaffCsv(storeId);
  const updateStaffMutation = useUpdateStaff(storeId);
  const deleteStaffMutation = useDeleteStaff(storeId);

  const isMutating =
    updateStaffMutation.isPending || deleteStaffMutation.isPending;

  const form = useForm<CreateStaffInput>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      name: "",
      email: "",
      employeeId: "",
      role: "STAFF",
      phone: "",
      password: "",
    },
  });

  const editForm = useForm<EditStaffInput>({
    resolver: zodResolver(editStaffSchema),
    defaultValues: {
      name: "",
      email: "",
      employeeId: "",
      role: "STAFF",
      phone: "",
    },
  });

  function editFormRole(role: StaffListItem["role"]): EditStaffInput["role"] {
    return role === "STORE_MANAGER" ? "STORE_MANAGER" : "STAFF";
  }

  function staffRoleLabel(role: StaffListItem["role"]) {
    if (role === "STORE_MANAGER") return store.staff.roles.STORE_MANAGER;
    if (role === "STAFF") return store.staff.roles.STAFF;
    return role;
  }

  function handleSuggestPassword() {
    const password = generateSecurePassword();
    form.setValue("password", password, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setShowPassword(true);
  }

  function handleModalChange(open: boolean) {
    setModalOpen(open);
    if (!open) {
      form.reset();
      setSubmitError(null);
      setShowPassword(false);
    }
  }

  function staffMutationErrorMessage(error: unknown, fallbackConflict: string): string {
    if (error instanceof ApiError) {
      const message = error.body.message?.trim();
      if (message && message !== "Request failed") return message;

      if (error.status === 400 && error.body.details) {
        return "Check the form fields — one or more values are invalid.";
      }
      if (error.status === 503) {
        return "Database connection is temporarily unavailable. Ask your teammate to fix Vercel DATABASE_URL and redeploy.";
      }
      if (error.status === 500) {
        return "Server error while creating staff (usually database login). Check Vercel logs for [api.staff] create failed.";
      }
      if (error.status === 401 || error.status === 403) {
        return "Your session expired. Sign out and sign in again.";
      }
      if (error.status === 409) {
        return message || fallbackConflict;
      }
      if (error.status === 502) {
        return message || "Could not update staff login. Try again in a few minutes.";
      }
    }
    if (error instanceof Error && /failed to fetch|network/i.test(error.message)) {
      return "Cannot reach the server. Check your internet connection and try again.";
    }
    return errors.generic;
  }

  function openEditDialog(member: StaffListItem) {
    setEditSubmitError(null);
    setStaffToEdit(member);
    editForm.reset({
      name: member.name,
      email: member.email ?? "",
      employeeId: member.employeeId,
      role: editFormRole(member.role),
      phone: member.phone ?? "",
    });
  }

  function handleEditModalChange(open: boolean) {
    if (!open) {
      setStaffToEdit(null);
      setEditSubmitError(null);
      editForm.reset({
        name: "",
        email: "",
        employeeId: "",
        role: "STAFF",
        phone: "",
      });
    }
  }

  async function onEditSubmit(values: EditStaffInput) {
    if (!staffToEdit) return;

    setEditSubmitError(null);
    try {
      await updateStaffMutation.mutateAsync({
        staffId: staffToEdit.id,
        payload: values,
      });
      toast({
        title: store.staff.updated,
        description: staffToEdit.name,
      });
      setStaffToEdit(null);
    } catch (error) {
      const message = staffMutationErrorMessage(
        error,
        "This email or employee ID is already in use.",
      );
      setEditSubmitError(message);
      toast({ title: message });
    }
  }

  function onInvalid() {
    setSubmitError(
      "Fix the highlighted fields (employee ID must be uppercase letters/numbers only).",
    );
  }

  async function onSubmit(values: CreateStaffInput) {
    setSubmitError(null);
    try {
      await createStaffMutation.mutateAsync(values);
      toast({
        title: store.staff.addStaff,
        description: store.staff.accountCreated,
      });
      form.reset();
      setShowPassword(false);
      setModalOpen(false);
    } catch (error) {
      const message = staffMutationErrorMessage(
        error,
        "This email or employee ID is already in use.",
      );
      setSubmitError(message);
      toast({ title: message });
    }
  }

  function handleSetActive(member: StaffListItem, isActive: boolean) {
    if (member.isActive === isActive) return;

    updateStaffMutation.mutate(
      {
        staffId: member.id,
        payload: { isActive },
      },
      {
        onSuccess: () => {
          toast({
            title: store.staff.statusUpdated,
            description: isActive ? store.staff.active : store.staff.inactive,
          });
        },
        onError: () => toast({ title: errors.generic }),
      },
    );
  }

  async function handleConfirmDelete() {
    if (!staffToDelete) return;

    try {
      await deleteStaffMutation.mutateAsync(staffToDelete.id);
      toast({
        title: store.staff.deleted,
        description: staffToDelete.name,
      });
      setStaffToDelete(null);
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 409
          ? error.body.message ?? store.staff.actions.deleteBlocked
          : errors.generic;
      toast({ title: message });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {backHref ? (
            <Link
              href={backHref}
              prefetch={false}
              className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-brand-gold"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {backLabel ?? store.storeDetail.backToPortfolio}
            </Link>
          ) : null}
          <h1 className="font-display text-2xl font-bold text-text-primary">
            {store.staff.title}
          </h1>
          {readOnly ? (
            <p className="mt-1 text-sm text-text-secondary">{store.staff.readOnlyHint}</p>
          ) : null}
        </div>
        {!readOnly ? (
          <div className="flex flex-wrap gap-2">
            {showImport ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void importStaffMutation
                      .mutateAsync(file)
                      .then((result) => {
                        toast({
                          title: store.staff.importResult
                            .replace("{created}", String(result.createdCount))
                            .replace("{failed}", String(result.failedCount)),
                        });
                      })
                      .catch(() => toast({ title: errors.generic }));
                    event.currentTarget.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={importStaffMutation.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 size-4" aria-hidden />
                  {store.staff.importCsv}
                </Button>
              </>
            ) : null}
            <Button type="button" onClick={() => setModalOpen(true)}>
              {store.staff.addStaff}
            </Button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div aria-live="polite" aria-busy="true">
          <Skeleton className="h-48 rounded-card" />
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface-card shadow-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-surface-secondary">
              <tr>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  {store.staff.columns.name}
                </th>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  {store.staff.columns.employeeId}
                </th>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  {store.staff.columns.role}
                </th>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  {store.staff.columns.phone}
                </th>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  {store.staff.columns.email}
                </th>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  {store.staff.columns.createdAt}
                </th>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  {store.staff.columns.visits}
                </th>
                {readOnly ? (
                  <>
                    <th className="px-4 py-3 font-medium text-text-secondary">
                      {store.staff.columns.conversionRate}
                    </th>
                    <th className="px-4 py-3 font-medium text-text-secondary">
                      {store.staff.managerColumns.openFollowUps}
                    </th>
                  </>
                ) : null}
                <th className="px-4 py-3 font-medium text-text-secondary">
                  {store.staff.columns.status}
                </th>
                {!readOnly ? (
                  <th className="px-4 py-3 font-medium text-text-secondary">
                    {store.staff.columns.actions}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {data.map((member) => (
                  <tr key={member.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{member.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{member.employeeId}</td>
                    <td className="px-4 py-3">{staffRoleLabel(member.role)}</td>
                    <td className="px-4 py-3">{member.phone ?? "—"}</td>
                    <td className="px-4 py-3">{member.email ?? "—"}</td>
                    <td className="px-4 py-3">{formatDate(member.createdAt)}</td>
                    <td className="px-4 py-3">{member.monthlyVisits}</td>
                    {readOnly ? (
                      <>
                        <td className="px-4 py-3 font-numeric tabular-nums">
                          {member.conversionRate}%
                        </td>
                        <td className="px-4 py-3 font-numeric tabular-nums">
                          {member.openFollowUps}
                        </td>
                      </>
                    ) : null}
                    <td className="px-4 py-3">
                      <Badge variant={member.isActive ? "success" : "secondary"}>
                        {member.isActive ? store.staff.active : store.staff.inactive}
                      </Badge>
                    </td>
                    {!readOnly ? (
                      <td className="px-4 py-3">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            disabled={isMutating}
                            aria-label={store.staff.actions.menu}
                          >
                            <MoreHorizontal className="size-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={isMutating}
                            onSelect={() => openEditDialog(member)}
                          >
                            {store.staff.actions.edit}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={member.isActive || isMutating}
                            onSelect={() => handleSetActive(member, true)}
                          >
                            {store.staff.actions.markActive}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!member.isActive || isMutating}
                            onSelect={() => handleSetActive(member, false)}
                          >
                            {store.staff.actions.markInactive}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={!member.canDelete || isMutating}
                            className="text-status-error focus:text-status-error"
                            title={
                              member.canDelete ? undefined : store.staff.actions.deleteBlocked
                            }
                            onSelect={() => setStaffToDelete(member)}
                          >
                            {store.staff.actions.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    ) : null}
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={staffToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setStaffToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{store.staff.deleteConfirm.title}</DialogTitle>
            <DialogDescription>
              {staffToDelete
                ? store.staff.deleteConfirm.description.replace(
                    "{name}",
                    staffToDelete.name,
                  )
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={deleteStaffMutation.isPending}
              onClick={() => setStaffToDelete(null)}
            >
              {store.staff.deleteConfirm.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteStaffMutation.isPending}
              onClick={() => void handleConfirmDelete()}
            >
              {store.staff.deleteConfirm.confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={staffToEdit !== null} onOpenChange={handleEditModalChange}>
        <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{store.staff.editModal.title}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={(event) => {
                setEditSubmitError(null);
                void editForm.handleSubmit(onEditSubmit)(event);
              }}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{store.staff.modal.nameLabel}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{store.staff.modal.emailLabel}</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" autoComplete="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{store.staff.modal.employeeIdLabel}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="uppercase"
                        onChange={(event) =>
                          field.onChange(event.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{store.staff.modal.roleLabel}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={store.staff.modal.rolePlaceholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="STAFF">{store.staff.roles.STAFF}</SelectItem>
                        <SelectItem value="STORE_MANAGER">
                          {store.staff.roles.STORE_MANAGER}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{store.staff.modal.phoneLabel}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder={store.staff.modal.phonePlaceholder}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {editSubmitError && (
                <p className="text-sm text-status-error" role="alert">
                  {editSubmitError}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={updateStaffMutation.isPending}
              >
                {store.staff.editModal.save}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen} onOpenChange={handleModalChange}>
        <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{store.staff.modal.title}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={(event) => {
                setSubmitError(null);
                void form.handleSubmit(onSubmit, onInvalid)(event);
              }}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{store.staff.modal.nameLabel}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{store.staff.modal.emailLabel}</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" autoComplete="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{store.staff.modal.employeeIdLabel}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="uppercase"
                        onChange={(event) =>
                          field.onChange(event.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{store.staff.modal.roleLabel}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={store.staff.modal.rolePlaceholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="STAFF">{store.staff.roles.STAFF}</SelectItem>
                        <SelectItem value="STORE_MANAGER">
                          {store.staff.roles.STORE_MANAGER}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{store.staff.modal.phoneLabel}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder={store.staff.modal.phonePlaceholder}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>{store.staff.modal.passwordLabel}</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1 text-xs text-brand-gold"
                        onClick={handleSuggestPassword}
                      >
                        <Sparkles className="mr-1 size-3.5" aria-hidden="true" />
                        {store.staff.modal.suggestPassword}
                      </Button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder={store.staff.modal.passwordPlaceholder}
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
                    <p className="text-xs text-text-muted">{store.staff.modal.passwordHint}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {submitError && (
                <p className="text-sm text-status-error" role="alert">
                  {submitError}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={createStaffMutation.isPending}>
                {store.staff.addStaff}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
