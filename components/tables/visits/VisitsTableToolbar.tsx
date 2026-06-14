import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VisitsCopy } from "./types";

interface VisitsTableToolbarProps {
  copy: VisitsCopy;
  total: number;
  searchPlaceholder: string;
  search: string;
  isSearching?: boolean;
  onSearchChange: (value: string) => void;
  onImport: (file: File) => void;
  showImport?: boolean;
  importDisabled: boolean;
  isImporting: boolean;
  importStatusMessage?: string;
  importStatusTone?: "default" | "success" | "error";
}

export function VisitsTableToolbar({
  copy,
  total,
  searchPlaceholder,
  search,
  isSearching = false,
  onSearchChange,
  onImport,
  showImport = false,
  importDisabled,
  isImporting,
  importStatusMessage,
  importStatusTone = "default",
}: VisitsTableToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="font-display text-xl font-semibold text-text-primary">
        {copy.title}{" "}
        <span className="font-numeric text-base font-medium text-text-muted">
          ({total.toLocaleString("en-IN")})
        </span>
      </h2>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:w-64">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className={isSearching ? "pr-9" : undefined}
            aria-label={searchPlaceholder}
            aria-busy={isSearching}
          />
          {isSearching ? (
            <Loader2
              className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-muted"
              aria-hidden
            />
          ) : null}
        </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-hidden={!showImport}
            tabIndex={showImport ? 0 : -1}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImport(file);
              event.currentTarget.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={importDisabled || isImporting}
            onClick={() => fileInputRef.current?.click()}
            className={showImport ? undefined : "hidden"}
          >
            <Upload className="h-4 w-4" />
            {isImporting ? copy.importingCsv : copy.importCsv}
          </Button>
      </div>
    </div>
      {importStatusMessage ? (
        <p
          className={
            importStatusTone === "success"
              ? "text-xs text-status-success"
              : importStatusTone === "error"
                ? "text-xs text-status-error"
                : "text-xs text-text-muted"
          }
        >
          {importStatusMessage}
        </p>
      ) : null}
    </div>
  );
}
