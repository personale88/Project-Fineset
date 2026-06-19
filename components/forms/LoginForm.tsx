"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { requestPasswordResetAction } from "@/lib/auth/request-password-reset-action";
import { signInAction } from "@/lib/auth/sign-in-action";
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

const RESET_EMAIL_COOLDOWN_SECONDS = 60;

interface LoginFormProps {
  title: string;
  subtitle: string;
  submitLabel: string;
  errorInvalid: string;
  errorInactive: string;
  errorDeactivated: string;
  errorGeneric: string;
  errorWrongPortal: string;
  errorSessionExpired: string;
  forgotPasswordLabel: string;
  forgotPasswordEmailRequired: string;
  resetEmailSent: string;
  resetEmailSentHint: string;
  resetEmailCooldownLabel: string;
  resetEmailError: string;
  resetEmailRateLimited: string;
  resetEmailRedirectError: string;
  resetSuccessMessage: string;
}

export function LoginForm(props: LoginFormProps) {
  const {
    title,
    subtitle,
    submitLabel,
    errorInvalid,
    errorInactive,
    errorDeactivated,
    errorGeneric,
    errorWrongPortal,
    errorSessionExpired,
    forgotPasswordLabel,
    forgotPasswordEmailRequired,
    resetEmailSent,
    resetEmailSentHint,
    resetEmailCooldownLabel,
    resetEmailError,
    resetEmailRateLimited,
    resetEmailRedirectError,
    resetSuccessMessage,
  } = props;

  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetHint, setResetHint] = useState<string | null>(null);
  const [resetCooldownSeconds, setResetCooldownSeconds] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const submitGuardRef = useRef(false);

  const callbackUrl = searchParams.get("callbackUrl");
  const urlError = searchParams.get("error");
  const resetStatus = searchParams.get("reset");

  const initialMessage = resetStatus === "success" ? resetSuccessMessage : null;

  const urlBootstrapError = useMemo(() => {
    if (!urlError) return null;
    if (urlError === "account_inactive") return errorInactive;
    if (urlError === "account_deactivated") return errorDeactivated;
    if (urlError === "wrong_portal") return errorWrongPortal;
    if (urlError === "session_expired") return errorSessionExpired;
    return errorInvalid;
  }, [urlError, errorInactive, errorDeactivated, errorWrongPortal, errorSessionExpired, errorInvalid]);

  useEffect(() => {
    if (!urlError) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("error")) return;
    url.searchParams.delete("error");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [urlError]);

  useEffect(() => {
    if (resetCooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResetCooldownSeconds((current) => (current > 1 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resetCooldownSeconds]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitGuardRef.current || isPending) return;

    submitGuardRef.current = true;
    setError(null);
    setResetMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      try {
        const result = await signInAction(email, password, callbackUrl);

        if (!result.ok) {
          submitGuardRef.current = false;
          switch (result.code) {
            case "invalid_credentials":
              setError(errorInvalid);
              break;
            case "inactive":
              setError(errorInactive);
              break;
            case "deactivated":
              setError(errorDeactivated);
              break;
            case "rate_limited":
              setError("Too many attempts. Please wait a few minutes and try again.");
              break;
            default:
              setError(errorGeneric);
          }
          return;
        }

        window.location.assign(result.redirectTo);
      } catch {
        submitGuardRef.current = false;
        setError(errorGeneric);
      }
    });
  }

  function handleForgotPassword() {
    const emailInput = document.getElementById("email") as HTMLInputElement | null;
    const email = emailInput?.value?.trim().toLowerCase();
    if (!email) {
      setError(forgotPasswordEmailRequired);
      setResetMessage(null);
      return;
    }

    setError(null);
    setResetMessage(null);
    setResetHint(null);
    if (resetCooldownSeconds > 0) return;

    startTransition(async () => {
      const result = await requestPasswordResetAction(email);

      if (!result.ok) {
        switch (result.code) {
          case "invalid_email":
            setError(forgotPasswordEmailRequired);
            break;
          case "rate_limited":
            setError(resetEmailRateLimited);
            break;
          case "email_not_configured":
            setError(resetEmailRedirectError);
            break;
          default:
            setError(resetEmailError);
        }
        return;
      }

      setResetMessage(resetEmailSent);
      setResetHint(resetEmailSentHint);
      setResetCooldownSeconds(RESET_EMAIL_COOLDOWN_SECONDS);
    });
  }

  const isLoading = isPending;
  const forgotPasswordDisabled = isLoading || resetCooldownSeconds > 0;
  const forgotPasswordText =
    resetCooldownSeconds > 0
      ? resetEmailCooldownLabel.replace("{seconds}", String(resetCooldownSeconds))
      : forgotPasswordLabel;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="username"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="pr-24"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                className="absolute right-1 top-1 h-8 px-2 text-xs"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={isLoading}
              >
                {showPassword ? "Hide" : "Show"}
              </Button>
            </div>
          </div>

          {(initialMessage || resetMessage) && (
            <div className="space-y-1" role="status">
              <p className="text-sm text-status-success">
                {initialMessage ?? resetMessage}
              </p>
              {resetHint ? (
                <p className="text-sm text-text-secondary">{resetHint}</p>
              ) : null}
            </div>
          )}

          {!isLoading && (error || urlBootstrapError) && (
            <p className="text-sm text-status-error" role="alert">
              {error ?? urlBootstrapError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in…" : submitLabel}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full text-sm"
            disabled={forgotPasswordDisabled}
            onClick={handleForgotPassword}
          >
            {forgotPasswordText}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
