"use client";

import { ShieldCheck } from "lucide-react";

interface LocationExceptionBannerCopy {
  title: string;
  description: string;
  expiresLabel: string;
}

interface LocationExceptionBannerProps {
  copy: LocationExceptionBannerCopy;
  expiresAt: string;
}

export function LocationExceptionBanner({ copy, expiresAt }: LocationExceptionBannerProps) {
  return (
    <div className="rounded-card border border-status-success/30 bg-status-success/5 p-3 text-sm">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-status-success" aria-hidden />
        <div>
          <p className="font-medium text-text-primary">{copy.title}</p>
          <p className="mt-1 text-text-secondary">{copy.description}</p>
          <p className="mt-1 text-xs text-text-muted">
            {copy.expiresLabel.replace("{time}", new Date(expiresAt).toLocaleString())}
          </p>
        </div>
      </div>
    </div>
  );
}
