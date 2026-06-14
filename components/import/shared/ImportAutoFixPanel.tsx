"use client";

import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { content } from "@/content/en";
import type { ImportTransformOptions } from "@/lib/import-engine/types";

interface ImportAutoFixPanelProps {
  options: ImportTransformOptions;
  onChange: (options: ImportTransformOptions) => void;
  isRefreshing?: boolean;
}

export function ImportAutoFixPanel({
  options,
  onChange,
  isRefreshing = false,
}: ImportAutoFixPanelProps) {
  const copy = content.import.confirm;

  return (
    <div className="rounded-card border border-border bg-surface-card px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-text-primary">{copy.autoFixTitle}</h3>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">{copy.autoFixIntro}</p>
        </div>
        {isRefreshing && (
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {copy.autoFixRefreshing}
          </span>
        )}
      </div>

      <div className="mt-4 rounded-md bg-surface-muted/50 px-3 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
          {copy.autoFixAlwaysOnTitle}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
          {copy.autoFixAlwaysOn.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-md border border-border px-3 py-3">
        <input
          id="import-fix-invalid-phone"
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-border"
          checked={options.importInvalidPhoneAsEmpty}
          disabled={isRefreshing}
          onChange={(event) =>
            onChange({
              ...options,
              importInvalidPhoneAsEmpty: event.target.checked,
            })
          }
        />
        <div>
          <Label htmlFor="import-fix-invalid-phone" className="text-sm font-medium text-text-primary">
            {copy.autoFixInvalidPhoneLabel}
          </Label>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">
            {copy.autoFixInvalidPhoneHint}
          </p>
        </div>
      </div>
    </div>
  );
}
