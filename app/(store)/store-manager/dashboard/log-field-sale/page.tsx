import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { content } from "@/content/en";
import { FieldSalesForm } from "@/components/forms/FieldSalesForm";
import { ManagerActorSetupGate } from "@/components/store/ManagerActorSetupGate";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { buildPortalFormSuccessPaths } from "@/lib/utils/portal-form-paths";
import { storeManagerMyWorkHubHref } from "@/lib/utils/store-dashboard-url";

export default function StoreManagerLogFieldSalePage() {
  return (
    <ManagerActorSetupGate requireLink>
      <div className="space-y-4 lg:space-y-6">
        <div className="space-y-3">
          <Link
            href={storeManagerMyWorkHubHref()}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-brand-gold"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {content.common.back}
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-text-primary">
              {content.fieldSalesForm.title}
            </h1>
            <p className="text-text-secondary">{content.fieldSalesForm.subtitle}</p>
          </div>
        </div>

        <FieldSalesForm
          copy={content.fieldSalesForm}
          common={content.common}
          errors={content.errors}
          successPaths={buildPortalFormSuccessPaths(STORE_MANAGER_DASHBOARD_PATH, {
            managerPersonalRoutes: true,
          })}
        />
      </div>
    </ManagerActorSetupGate>
  );
}
