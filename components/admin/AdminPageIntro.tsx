import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: LucideIcon;
  className?: string;
}

/** Mobile-only title row with a back link (desktop title lives in child panels). */
export function AdminMobileBackHeader({
  title,
  backHref,
  backLabel,
  backTrailing,
  titleTrailing,
  className,
}: {
  title: string;
  backHref: string;
  backLabel: string;
  /** Content beside the back link (e.g. scope summary on analytics). */
  backTrailing?: React.ReactNode;
  /** Actions aligned to the right of the title row. */
  titleTrailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("min-w-0 lg:hidden", className)}>
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href={backHref}
          prefetch={false}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-brand-gold"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          {backLabel}
        </Link>
        {backTrailing ? (
          <div className="flex min-w-0 flex-1 items-center justify-end overflow-hidden">
            {backTrailing}
          </div>
        ) : null}
      </div>
      <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2">
        <h1 className="shrink-0 font-display text-xl font-bold text-text-primary">{title}</h1>
        {titleTrailing ? (
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-hidden">
            {titleTrailing}
          </div>
        ) : null}
      </div>
    </header>
  );
}

/** Consistent page title + supporting copy for admin dashboard pages. */
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
          <h1 className="font-display text-xl font-bold text-text-primary sm:text-2xl lg:text-3xl">
            {title}
          </h1>
        </div>
      ) : (
        <h1 className="font-display text-xl font-bold text-text-primary sm:text-2xl lg:text-3xl">
          {title}
        </h1>
      )}
      {subtitle ? (
        <p className="mt-1 hidden max-w-2xl text-sm text-text-muted lg:block">{subtitle}</p>
      ) : null}
      {meta ? (
        <p className="mt-1 hidden max-w-2xl text-xs text-text-muted lg:block">{meta}</p>
      ) : null}
    </header>
  );
}

/** Compact page title for docked child side panels (desktop). */
export function AdminChildPanelIntro({
  title,
  subtitle,
  meta,
  className,
}: AdminPageHeaderProps) {
  return (
    <header className={cn("px-3 pb-3 pt-4", className)}>
      <h1 className="font-display text-lg font-bold leading-tight text-text-primary">{title}</h1>
      {subtitle ? (
        <p className="mt-1.5 text-xs leading-snug text-text-muted">{subtitle}</p>
      ) : null}
      {meta ? <p className="mt-1 text-xs leading-snug text-text-muted">{meta}</p> : null}
    </header>
  );
}

interface AdminPageIntroProps extends AdminPageHeaderProps {
  introClassName?: string;
}

/** Page header for admin dashboard routes (navigation lives in PortalShell sideNav). */
export function AdminPageIntro({ introClassName, ...header }: AdminPageIntroProps) {
  return (
    <div className={cn("min-w-0", introClassName)}>
      <AdminPageHeader {...header} />
    </div>
  );
}
