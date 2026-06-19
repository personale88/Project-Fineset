"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { setPasswordAction } from "@/lib/auth/set-password-action";
import { validatePassword } from "@/lib/auth/password-policy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ResetPasswordFormProps {
  title: string;
  subtitle: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  submitLabel: string;
  backToSignInLabel: string;
  errorGeneric: string;
  errorMismatch: string;
  errorNoSession: string;
  errorAuthCallback: string;
}

export function ResetPasswordForm({
  title,
  subtitle,
  passwordLabel,
  passwordPlaceholder,
  confirmPasswordLabel,
  confirmPasswordPlaceholder,
  submitLabel,
  backToSignInLabel,
  errorGeneric,
  errorMismatch,
  errorNoSession,
  errorAuthCallback,
}: ResetPasswordFormProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const isInvite = searchParams.get("invite") === "1";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const submitGuardRef = useRef(false);

  const hasToken = token.length > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitGuardRef.current || isPending || !hasToken) return;

    submitGuardRef.current = true;
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      submitGuardRef.current = false;
      setError(errorMismatch);
      return;
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.success) {
      submitGuardRef.current = false;
      setError(passwordCheck.error ?? errorGeneric);
      return;
    }

    startTransition(async () => {
      const result = await setPasswordAction(token, password, confirmPassword, isInvite);

      if (!result.ok) {
        submitGuardRef.current = false;
        switch (result.code) {
          case "invalid_token":
            setError(errorAuthCallback);
            break;
          case "password_mismatch":
            setError(errorMismatch);
            break;
          case "weak_password":
            setError(errorGeneric);
            break;
          default:
            setError(errorGeneric);
        }
        return;
      }

      window.location.assign("/?reset=success");
    });
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasToken ? (
          <div className="space-y-4">
            <p className="text-sm text-status-error" role="alert">
              {errorNoSession}
            </p>
            <Button asChild className="w-full">
              <Link href="/">{backToSignInLabel}</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{passwordLabel}</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={passwordPlaceholder}
                  required
                  autoComplete="new-password"
                  className="pr-24"
                  disabled={isPending}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute right-1 top-1 h-8 px-2 text-xs"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isPending}
                >
                  {showPassword ? "Hide" : "Show"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{confirmPasswordLabel}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={confirmPasswordPlaceholder}
                  required
                  autoComplete="new-password"
                  className="pr-24"
                  disabled={isPending}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute right-1 top-1 h-8 px-2 text-xs"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  disabled={isPending}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </Button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-status-error" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Updating…" : submitLabel}
            </Button>

            <Button asChild type="button" variant="ghost" className="w-full text-sm">
              <Link href="/">{backToSignInLabel}</Link>
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
