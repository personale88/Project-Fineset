"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Check, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { content } from "@/content/en";
import type { FeatureSchemaConfig, ParsedFile } from "@/lib/import-engine/types";
import { ImportEngineError } from "@/lib/import-engine/types";
import { mergeExcelSheets, parseFile } from "@/lib/import-engine/core/fileParser";
import { downloadImportTemplate } from "@/lib/import-engine/utils/template";
import { cn } from "@/lib/utils";

interface UploadStepProps {
  schema: FeatureSchemaConfig;
  onParsed: (file: ParsedFile) => void;
  error: string | null;
  onError: (message: string | null) => void;
}

function needsSheetSelection(parsed: ParsedFile): boolean {
  return (parsed.sheetData?.length ?? 0) > 1;
}

export function UploadStep({ schema, onParsed, error, onError }: UploadStepProps) {
  const copy = content.import.upload;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const showSheetSelector = parsed ? needsSheetSelection(parsed) : false;

  const selectedRowCount = useMemo(() => {
    if (!parsed?.sheetData) return parsed?.totalRows ?? 0;
    const selected = new Set(selectedSheets);
    return parsed.sheetData
      .filter((sheet) => selected.has(sheet.name))
      .reduce((total, sheet) => total + sheet.rows.length, 0);
  }, [parsed, selectedSheets]);

  const handleFile = useCallback(
    async (file: File) => {
      onError(null);
      setIsLoading(true);
      try {
        const result = await parseFile(file);
        setParsed(result);

        if (needsSheetSelection(result)) {
          setSelectedSheets(result.sheetData!.map((sheet) => sheet.name));
          return;
        }

        onParsed(result);
      } catch (err) {
        const message =
          err instanceof ImportEngineError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to read file";
        onError(message);
        setParsed(null);
        setSelectedSheets([]);
      } finally {
        setIsLoading(false);
      }
    },
    [onError, onParsed],
  );

  const handleContinueWithSheets = useCallback(() => {
    if (!parsed?.sheetData) return;

    onError(null);
    try {
      const merged = mergeExcelSheets(
        parsed.sheetData,
        selectedSheets,
        parsed.fileName,
        parsed.fileSize,
        parsed.emptySheetNames ?? [],
      );
      onParsed(merged);
    } catch (err) {
      const message =
        err instanceof ImportEngineError
          ? err.message
          : err instanceof Error
            ? err.message
            : copy.noSheetsSelected;
      onError(message);
    }
  }, [copy.noSheetsSelected, onError, onParsed, parsed, selectedSheets]);

  const toggleSheet = useCallback((sheetName: string, checked: boolean) => {
    setSelectedSheets((current) => {
      if (checked) {
        return current.includes(sheetName) ? current : [...current, sheetName];
      }
      return current.filter((name) => name !== sheetName);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed p-6 text-center transition-colors",
          isDragging ? "border-brand-gold bg-brand-gold/5" : "border-border bg-surface-muted/30",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
      >
        <Upload className="mb-3 h-8 w-8 text-brand-gold" aria-hidden />
        <p className="font-medium text-text-primary">Drop your file here</p>
        <p className="mt-1 text-sm text-text-secondary">CSV or Excel (.csv, .xlsx, .xls)</p>
        <Button type="button" variant="outline" className="mt-4" disabled={isLoading}>
          {isLoading ? "Reading file…" : "Choose file"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>

      {error && (
        <div className="rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {parsed && (
        <div className="rounded-card border border-border bg-surface-card p-4 text-sm">
          <p className="font-medium text-text-primary">{parsed.fileName}</p>
          <p className="mt-1 text-text-secondary">
            {(parsed.fileSize / 1024).toFixed(1)} KB ·{" "}
            {(showSheetSelector ? selectedRowCount : parsed.totalRows).toLocaleString()} rows
          </p>

          {showSheetSelector && parsed.sheetData && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <div>
                <p className="font-medium text-text-primary">{copy.sheetsTitle}</p>
                <p className="mt-1 text-xs text-text-muted">{copy.sheetsHint}</p>
              </div>

              <div className="flex gap-3 text-xs">
                <button
                  type="button"
                  className="text-brand-gold hover:underline"
                  onClick={() => setSelectedSheets(parsed.sheetData!.map((sheet) => sheet.name))}
                >
                  {copy.selectAll}
                </button>
                <button
                  type="button"
                  className="text-text-muted hover:underline"
                  onClick={() => setSelectedSheets([])}
                >
                  {copy.deselectAll}
                </button>
              </div>

              <div
                className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
                role="list"
              >
                {parsed.sheetData.map((sheet) => {
                  const inputId = `import-sheet-${sheet.name}`;
                  const checked = selectedSheets.includes(sheet.name);

                  return (
                    <label
                      key={sheet.name}
                      htmlFor={inputId}
                      role="listitem"
                      className={cn(
                        "flex cursor-pointer flex-col gap-1.5 rounded-card border px-3 py-2.5 transition-colors",
                        checked
                          ? "border-brand-gold/60 bg-brand-gold/5"
                          : "border-border hover:bg-surface-muted/40",
                      )}
                    >
                      <span className="flex items-start gap-2">
                        <input
                          id={inputId}
                          type="checkbox"
                          className="peer sr-only"
                          checked={checked}
                          onChange={(event) => toggleSheet(sheet.name, event.target.checked)}
                        />
                        <span
                          aria-hidden="true"
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                            "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-gold/50 peer-focus-visible:ring-offset-1",
                            checked
                              ? "border-brand-gold bg-brand-gold text-white"
                              : "border-border bg-surface-card text-transparent",
                          )}
                        >
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                        <Label
                          htmlFor={inputId}
                          className="min-w-0 flex-1 leading-snug text-text-primary"
                        >
                          {sheet.name}
                        </Label>
                      </span>
                      <span className="pl-6 text-xs text-text-muted">
                        {copy.sheetRows.replace("{count}", sheet.rows.length.toLocaleString())}
                      </span>
                    </label>
                  );
                })}
              </div>

              <Button
                type="button"
                disabled={selectedSheets.length === 0}
                onClick={handleContinueWithSheets}
              >
                {copy.continue}
              </Button>
            </div>
          )}

          {!showSheetSelector &&
            parsed.warnings.map((warning) => (
              <p key={warning} className="mt-2 text-status-warning">
                {warning}
              </p>
            ))}

          <Button
            type="button"
            variant="ghost"
            className="mt-3 h-8 px-2"
            onClick={() => {
              setParsed(null);
              setSelectedSheets([]);
              onError(null);
              inputRef.current?.click();
            }}
          >
            Change file
          </Button>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => downloadImportTemplate(schema)}
      >
        Download import template
      </Button>
    </div>
  );
}
