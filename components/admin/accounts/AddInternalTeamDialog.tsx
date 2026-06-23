"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { invitePlatformAdmin } from "@/lib/api/platform-admins";
import { ADMIN_PERMISSION_KEYS } from "@/lib/auth/admin-permissions";
import { generateSecurePassword } from "@/lib/auth/generate-password";
import {
  addInternalTeamFormSchema,
  type AddInternalTeamFormInput,
} from "@/lib/validations/platform-admin.schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Content } from "@/content/en";

type InternalTeamCopy = Content["admin"]["accounts"]["internalTeam"];

const defaultPermissions: AddInternalTeamFormInput["permissions"] = {
  accounts: true,
  portfolio: true,
};

const defaultFormValues: AddInternalTeamFormInput = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "PLATFORM_ADMIN",
  permissions: defaultPermissions,
};

interface AddInternalTeamDialogProps {
  copy: InternalTeamCopy;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errors: Content["errors"];
}

export function AddInternalTeamDialog({
  copy,
  open,
  onOpenChange,
  errors,
}: AddInternalTeamDialogProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const form = useForm<AddInternalTeamFormInput>({
    resolver: zodResolver(addInternalTeamFormSchema),
    defaultValues: defaultFormValues,
  });

  const selectedRole = form.watch("role");

  const addMutation = useMutation({
    mutationFn: invitePlatformAdmin,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "team"] });
    },
  });

  function resetModalState() {
    form.reset(defaultFormValues);
    setSubmitError(null);
    setShowPassword(false);
    setCreatedCredentials(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      resetModalState();
    }
  }

  function handleSuggestPassword() {
    form.setValue("password", generateSecurePassword(), { shouldValidate: true });
    setShowPassword(true);
  }

  function addMemberErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      const message = error.body.message?.trim();
      if (message && message !== "Request failed") return message;
      if (error.status === 409) return copy.modal.emailConflict;
      if (error.status === 502 || error.status === 503) return copy.modal.smtpNotConfigured;
      if (error.status === 400 && error.body.details) {
        return "Check the form fields — one or more values are invalid.";
      }
    }
    if (error instanceof Error && /failed to fetch|network/i.test(error.message)) {
      return "Cannot reach the server. Check your connection and try again.";
    }
    return copy.modal.genericError || errors.generic;
  }

  async function onSubmit(values: AddInternalTeamFormInput) {
    setSubmitError(null);
    try {
      const result = await addMutation.mutateAsync(values);
      if (result.emailSent) {
        toast({
          title: copy.modal.createSuccessTitle,
          description: copy.modal.emailInviteDescription.replace("{email}", result.member.email),
        });
        handleOpenChange(false);
        return;
      }

      setCreatedCredentials({
        email: result.member.email,
        password: values.password,
      });
      toast({
        title: copy.modal.createSuccessTitle,
        description: copy.modal.createSuccessDescription,
      });
    } catch (error) {
      const message = addMemberErrorMessage(error);
      setSubmitError(message);
      toast({ title: message });
    }
  }

  const modal = copy.modal;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{modal.title}</DialogTitle>
          {createdCredentials ? (
            <DialogDescription asChild>
              <div className="space-y-3 pt-2 text-left text-sm text-text-secondary">
                <p>{modal.createSuccessDescription}</p>
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
                <p className="text-xs">{modal.passwordHint}</p>
              </div>
            </DialogDescription>
          ) : (
            <DialogDescription>{modal.description}</DialogDescription>
          )}
        </DialogHeader>

        {createdCredentials ? (
          <Button type="button" className="w-full" onClick={() => handleOpenChange(false)}>
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
                    <FormLabel>{modal.nameLabel}</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="name" placeholder={modal.namePlaceholder} />
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
                    <FormLabel>{modal.emailLabel}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        autoComplete="email"
                        placeholder={modal.emailPlaceholder}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{modal.phoneLabel}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        maxLength={10}
                        placeholder={modal.phonePlaceholder}
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
                    <FormLabel>{modal.roleLabel}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === "MASTER_ADMIN") {
                          form.clearErrors("permissions");
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger id="internal-team-role">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PLATFORM_ADMIN">{copy.roles.platform}</SelectItem>
                        <SelectItem value="MASTER_ADMIN">{copy.roles.master}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-text-muted">{modal.roleHint}</p>
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
                      <FormLabel>{modal.passwordLabel}</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1 text-xs text-brand-gold"
                        onClick={handleSuggestPassword}
                      >
                        <Sparkles className="mr-1 size-3.5" aria-hidden />
                        {modal.suggestPassword}
                      </Button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder={modal.passwordPlaceholder}
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
                            <EyeOff className="size-4 text-text-muted" aria-hidden />
                          ) : (
                            <Eye className="size-4 text-text-muted" aria-hidden />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <p className="text-xs text-text-muted">{modal.passwordHint}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedRole === "MASTER_ADMIN" ? (
                <p className="rounded-md border border-border bg-surface-secondary px-3 py-2 text-xs text-text-muted">
                  {modal.masterPermissionsHint}
                </p>
              ) : (
                <div className="space-y-2">
                  <Label>{modal.permissionsLabel}</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ADMIN_PERMISSION_KEYS.map((key) => (
                      <FormField
                        key={key}
                        control={form.control}
                        name={`permissions.${key}` as const}
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                className="size-4 rounded border-border"
                                checked={field.value === true}
                                onChange={(event) => field.onChange(event.target.checked)}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {copy.permissionLabels[key]}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </div>
              )}

              {submitError ? (
                <p className="text-sm text-status-error" role="alert">
                  {submitError}
                </p>
              ) : null}

              <Button type="submit" className="w-full" disabled={addMutation.isPending}>
                {addMutation.isPending ? modal.submitting : modal.submit}
              </Button>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
