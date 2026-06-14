import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { content } from "@/content/en";
import { VisitForm } from "@/components/forms/VisitForm";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";

export default function StoreManagerLogVisitPage() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="space-y-3">
        <Link
          href={STORE_MANAGER_DASHBOARD_PATH}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-brand-gold"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {content.common.back}
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">
            {content.visitForm.title}
          </h1>
          <p className="text-text-secondary">{content.visitForm.subtitle}</p>
        </div>
      </div>

      <VisitForm
        copy={content.visitForm}
        common={content.common}
        errors={content.errors}
      />
    </div>
  );
}
