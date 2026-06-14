import { Suspense } from "react";
import { content } from "@/content/en";
import { RestoreSessionRedirect } from "@/components/auth/RestoreSessionRedirect";
import { SupabaseLoginForm } from "@/components/forms/SupabaseLoginForm";
import { Logo } from "@/components/shared/Logo";
import { isDevAuthBypassEnabled } from "@/lib/auth/dev-bypass";

interface LoginScreenProps {
  showLogo?: boolean;
}

export function LoginScreen({ showLogo = false }: LoginScreenProps) {
  const c = content.auth.login;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const devBypass = isDevAuthBypassEnabled();

  return (
    <>
      {supabaseUrl ? (
        <>
          <link rel="preconnect" href={supabaseUrl} />
          <link rel="dns-prefetch" href={supabaseUrl} />
        </>
      ) : null}
      <div className="flex w-full max-w-md flex-col gap-6">
        {showLogo ? (
          <div className="flex justify-center">
            <Logo size={56} />
          </div>
        ) : null}
        {devBypass ? (
          <p className="rounded-input border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-sm text-text-secondary">
            Dev mode: Supabase login is bypassed. Use any registered AppUser email
            (e.g. business owner or store manager accounts), or seeded dev accounts
            like <code className="text-xs">manager@store-alpha.local</code> with any
            password.
          </p>
        ) : null}
        {!devBypass ? <RestoreSessionRedirect /> : null}
        <Suspense fallback={<div className="text-text-secondary">{content.common.loading}</div>}>
          <SupabaseLoginForm
            title={c.title}
            subtitle={c.subtitle}
            submitLabel={c.submitLabel}
            errorInvalid={c.errorInvalid}
            errorInactive={c.errorInactive}
            errorDeactivated={c.errorDeactivated}
            errorGeneric={c.errorGeneric}
            errorWrongPortal={c.errorWrongPortal}
            errorSessionExpired={c.errorSessionExpired}
            forgotPasswordLabel={c.forgotPassword}
            forgotPasswordEmailRequired={c.forgotPasswordEmailRequired}
            resetEmailSent={c.resetEmailSent}
            resetEmailSentHint={c.resetEmailSentHint}
            resetEmailCooldownLabel={c.resetEmailCooldown}
            resetEmailError={c.resetEmailError}
            resetEmailRateLimited={c.resetEmailRateLimited}
            resetEmailRedirectError={c.resetEmailRedirectError}
            resetSuccessMessage={c.resetSuccess}
          />
        </Suspense>
      </div>
    </>
  );
}
