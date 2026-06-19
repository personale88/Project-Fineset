import { Suspense } from "react";
import { content } from "@/content/en";
import { LoginForm } from "@/components/forms/LoginForm";
import { Logo } from "@/components/shared/Logo";

interface LoginScreenProps {
  showLogo?: boolean;
}

export function LoginScreen({ showLogo = false }: LoginScreenProps) {
  const c = content.auth.login;

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      {showLogo ? (
        <div className="flex justify-center">
          <Logo size={56} />
        </div>
      ) : null}
      <Suspense fallback={<div className="text-text-secondary">{content.common.loading}</div>}>
        <LoginForm
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
  );
}
