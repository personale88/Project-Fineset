import type { LucideIcon } from "lucide-react";
import { AdminDashboardNav } from "@/components/admin/AdminDashboardNav";
import type { Content } from "@/content/en";
import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: LucideIcon;
  className?: string;
}

/** Consistent page title + supporting copy for admin dashboard tabs. */
export function AdminPageHeader({
  title,
  subtitle,
  meta,
  icon: Icon,
  className,
}: AdminPageHeaderProps) {
  return (
    <header className={cn("min-w-0", className)}>
      {Icon ? (
        <div className="flex items-center gap-2">
          <Icon className="size-6 shrink-0 text-brand-gold" aria-hidden />
          <h1 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
            {title}
          </h1>
        </div>
      ) : (
        <h1 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
          {title}
        </h1>
      )}
      {subtitle ? (
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">{subtitle}</p>
      ) : null}
      {meta ? (
        <p className="mt-1 max-w-2xl text-xs text-text-muted">{meta}</p>
      ) : null}
    </header>
  );
}

interface AdminPageIntroProps extends AdminPageHeaderProps {
  nav: Content["admin"]["nav"];
  navClassName?: string;
  introClassName?: string;
}

/** Page header followed by the admin tab navigation. */
export function AdminPageIntro({
  nav,
  navClassName,
  introClassName,
  ...header
}: AdminPageIntroProps) {
  return (
    <div className={cn("space-y-4", introClassName)}>
      <AdminPageHeader {...header} />
      <AdminDashboardNav labels={nav} className={navClassName} />
    </div>
  );
}
