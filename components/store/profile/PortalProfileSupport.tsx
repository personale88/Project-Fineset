"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  ChevronDown,
  Clock,
  CreditCard,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildTelHref, buildWhatsAppUrl, formatSupportPhoneDisplay } from "@/lib/utils/whatsapp-link";
import type { ProfileCopy } from "@/components/store/profile/profile-scope";

export interface PortalSupportContact {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
}

interface PortalProfileSupportProps {
  copy: ProfileCopy["support"];
  contact: PortalSupportContact;
  portalRole: "STORE_MANAGER" | "BUSINESS_OWNER";
  accountName: string;
  accountEmail: string;
}

function SupportContactCard({
  icon,
  title,
  description,
  actionLabel,
  href,
  external,
  tone = "default",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  external?: boolean;
  tone?: "default" | "whatsapp";
}) {
  return (
    <div className="flex h-full flex-col rounded-input border border-border bg-surface-secondary/25 p-4">
      <div
        className={cn(
          "mb-3 flex h-10 w-10 items-center justify-center rounded-full",
          tone === "whatsapp"
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-brand-gold/10 text-brand-gold",
        )}
      >
        {icon}
      </div>
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-text-muted">{description}</p>
      <Button
        asChild
        size="sm"
        variant={tone === "whatsapp" ? "default" : "outline"}
        className={cn("mt-4 w-full sm:w-auto", tone === "whatsapp" && "bg-emerald-600 hover:bg-emerald-700")}
      >
        <a
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {actionLabel}
        </a>
      </Button>
    </div>
  );
}

function SupportFaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="group rounded-input border border-border bg-surface-secondary/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-sm font-medium text-text-primary marker:content-none [&::-webkit-details-marker]:hidden">
        <span>{question}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-border px-3 py-3 text-sm leading-relaxed text-text-secondary">
        {answer}
      </div>
    </details>
  );
}

export function PortalProfileSupport({
  copy,
  contact,
  portalRole,
  accountName,
  accountEmail,
}: PortalProfileSupportProps) {
  const pathname = usePathname();
  const billingHref = `${pathname}?section=billing`;
  const email = contact.supportEmail.trim();
  const phone = contact.supportPhone.trim();
  const hasEmail = Boolean(email);
  const whatsappMessage = copy.whatsappMessage
    .replace("{platform}", contact.platformName)
    .replace("{name}", accountName.trim() || accountEmail)
    .replace("{email}", accountEmail);
  const whatsappHref = phone ? buildWhatsAppUrl(phone, whatsappMessage) : null;
  const telHref = phone ? buildTelHref(phone) : null;
  const phoneDisplay = phone ? formatSupportPhoneDisplay(phone) : "";
  const hasContact = hasEmail || telHref || whatsappHref;

  return (
    <div className="space-y-6">
      <div className="rounded-input border border-border bg-surface-secondary/30 px-4 py-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-gold" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm text-text-primary">{copy.intro}</p>
            <p className="flex items-center gap-1.5 text-xs text-text-muted">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {copy.responseTime}
            </p>
          </div>
        </div>
      </div>

      {hasContact ? (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{copy.contactTitle}</h3>
            <p className="mt-0.5 text-xs text-text-muted">{copy.contactHint}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {hasEmail ? (
              <SupportContactCard
                icon={<Mail className="h-5 w-5" aria-hidden />}
                title={copy.contactEmailTitle}
                description={copy.contactEmailHint.replace("{email}", email)}
                actionLabel={copy.contactEmailAction}
                href={`mailto:${email}?subject=${encodeURIComponent(
                  copy.emailSubject.replace("{platform}", contact.platformName),
                )}&body=${encodeURIComponent(
                  copy.emailBody
                    .replace("{platform}", contact.platformName)
                    .replace("{name}", accountName.trim() || accountEmail)
                    .replace("{email}", accountEmail)
                    .replace("{role}", portalRole === "BUSINESS_OWNER" ? "Business owner" : "Store manager"),
                )}`}
              />
            ) : null}
            {telHref ? (
              <SupportContactCard
                icon={<Phone className="h-5 w-5" aria-hidden />}
                title={copy.contactPhoneTitle}
                description={copy.contactPhoneHint.replace("{phone}", phoneDisplay)}
                actionLabel={copy.contactPhoneAction}
                href={telHref}
              />
            ) : null}
            {whatsappHref ? (
              <SupportContactCard
                icon={<WhatsAppIcon className="h-5 w-5" aria-hidden />}
                title={copy.contactWhatsAppTitle}
                description={copy.contactWhatsAppHint}
                actionLabel={copy.contactWhatsAppAction}
                href={whatsappHref}
                external
                tone="whatsapp"
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-input border border-border bg-surface-secondary/30 px-4 py-4 text-sm text-text-secondary">
          {copy.contactUnavailable}
        </div>
      )}

      {portalRole === "BUSINESS_OWNER" ? (
        <div className="flex flex-col gap-4 rounded-input border border-brand-gold/25 bg-brand-gold/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-brand-gold" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-text-primary">{copy.billingShortcutTitle}</p>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">
                {copy.billingShortcutBody}
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0 border-brand-gold/40">
            <Link href={billingHref}>{copy.billingShortcutAction}</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-input border border-border bg-surface-secondary/25 px-4 py-4">
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-gold" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-text-primary">{copy.managerBillingTitle}</p>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">
                {copy.managerBillingBody}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{copy.faqTitle}</h3>
          <p className="mt-0.5 text-xs text-text-muted">{copy.faqHint}</p>
        </div>
        <div className="space-y-2">
          {copy.faqs.map((item) => (
            <SupportFaqItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>
    </div>
  );
}
