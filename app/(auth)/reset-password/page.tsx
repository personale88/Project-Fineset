import { Suspense } from "react";
import { content } from "@/content/en";
import { ResetPasswordForm } from "@/components/forms/ResetPasswordForm";

export default function ResetPasswordPage() {
  const c = content.auth.resetPassword;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-primary px-page-x py-12">
      <div className="flex w-full max-w-md flex-col gap-4">
        <Suspense fallback={<div className="text-text-secondary">{content.common.loading}</div>}>
          <ResetPasswordForm
            title={c.title}
            subtitle={c.subtitle}
            passwordLabel={c.passwordLabel}
            passwordPlaceholder={c.passwordPlaceholder}
            confirmPasswordLabel={c.confirmPasswordLabel}
            confirmPasswordPlaceholder={c.confirmPasswordPlaceholder}
            submitLabel={c.submitLabel}
            backToSignInLabel={c.backToSignIn}
            errorGeneric={c.errorGeneric}
            errorMismatch={c.errorMismatch}
            errorNoSession={c.errorNoSession}
            errorAuthCallback={c.errorAuthCallback}
          />
        </Suspense>
      </div>
    </main>
  );
}
