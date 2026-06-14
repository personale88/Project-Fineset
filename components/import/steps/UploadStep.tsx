"use client";

import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FeatureSchemaConfig, ParsedFile } from "@/lib/import-engine/types";
import { ImportEngineError } from "@/lib/import-engine/types";
import { parseFile } from "@/lib/import-engine/core/fileParser";
import { downloadImportTemplate } from "@/lib/import-engine/utils/template";
import { cn } from "@/lib/utils";

interface UploadStepProps {
  schema: FeatureSchemaConfig;
  onParsed: (file: ParsedFile) => void;
  error: string | null;
  onError: (message: string | null) => void;
}

export function UploadStep({ schema, onParsed, error, onError }: UploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      onError(null);
      setIsLoading(true);
      try {
        const result = await parseFile(file);
        setParsed(result);
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
      } finally {
        setIsLoading(false);
      }
    },
    [onError, onParsed],
  );

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
            {(parsed.fileSize / 1024).toFixed(1)} KB · {parsed.totalRows.toLocaleString()} rows
          </p>
          {parsed.warnings.map((warning) => (
            <p key={warning} className="mt-2 text-status-warning">
              {warning}
            </p>
          ))}
          <Button
            type="button"
            variant="ghost"
            className="mt-3 h-8 px-2"
            onClick={() => inputRef.current?.click()}
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
