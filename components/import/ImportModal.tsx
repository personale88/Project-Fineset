"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImportStepIndicator } from "@/components/import/shared/ImportStepIndicator";
import { UploadStep } from "@/components/import/steps/UploadStep";
import { MappingStep } from "@/components/import/steps/MappingStep";
import { ConfirmationStep } from "@/components/import/steps/ConfirmationStep";
import { ProgressStep } from "@/components/import/steps/ProgressStep";
import { SummaryStep } from "@/components/import/steps/SummaryStep";
import { matchColumns } from "@/lib/import-engine/core/columnMatcher";
import { transformRows, mergeLookupCaches, buildLookupCacheFromRecords } from "@/lib/import-engine/core/transformer";
import { buildImportPreview, rowsForImport } from "@/lib/import-engine/core/validator";
import { getSchemaConfig } from "@/lib/import-engine/schema-configs";
import type {
  ColumnMappingResult,
  ImportPreview,
  ImportResult,
  ImportWizardStep,
  ParsedFile,
  TransformedRow,
} from "@/lib/import-engine/types";
import { dedupeImportRows, executeImport } from "@/lib/api/import";
import { getStaff } from "@/lib/api/staff";

interface ImportModalProps {
  featureKey: string;
  storeId: string;
  open: boolean;
  onClose: () => void;
  onImportComplete: (result: ImportResult) => void;
}

export function ImportModal({
  featureKey,
  storeId,
  open,
  onClose,
  onImportComplete,
}: ImportModalProps) {
  const schema = useMemo(() => getSchemaConfig(featureKey), [featureKey]);
  const [step, setStep] = useState<ImportWizardStep>("upload");
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [mappings, setMappings] = useState<ColumnMappingResult[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [transformedRows, setTransformedRows] = useState<TransformedRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [statusLabel, setStatusLabel] = useState("Preparing import…");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = useCallback(() => {
    setStep("upload");
    setParsedFile(null);
    setMappings([]);
    setPreview(null);
    setTransformedRows([]);
    setResult(null);
    setError(null);
    setProgress({ processed: 0, total: 0 });
    setStatusLabel("Preparing import…");
    setIsSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    if (step === "progress") return;
    if (step !== "upload" && !window.confirm("Discard this import?")) return;
    reset();
    onClose();
  }, [onClose, reset, step]);

  const handleParsed = useCallback(
    (file: ParsedFile) => {
      if (!schema) return;
      setParsedFile(file);
      const matched = matchColumns(file.headers, schema, file.rows);
      setMappings(matched.mappings);
      setStep("mapping");
    },
    [schema],
  );

  const buildPreview = useCallback(async () => {
    if (!schema || !parsedFile) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const phoneHeader = mappings.find((m) => m.matchedColumn?.supabaseColumn === "phone")
        ?.uploadedHeader;
      const emailHeader = mappings.find((m) => m.matchedColumn?.supabaseColumn === "email")
        ?.uploadedHeader;

      const dedupePayload = parsedFile.rows.map((row, rowIndex) => ({
        rowIndex,
        phone: phoneHeader ? row[phoneHeader] ?? null : null,
        email: emailHeader ? row[emailHeader] ?? null : null,
      }));

      const { results: dedupeResults } = await dedupeImportRows({
        featureKey,
        storeId,
        rows: dedupePayload,
      });

      const staff = await getStaff(storeId);
      const lookupCache = mergeLookupCaches(
        buildLookupCacheFromRecords(
          "staff",
          staff.map((member) => ({ display: member.name, key: member.id })),
        ),
        buildLookupCacheFromRecords(
          "staff",
          staff.map((member) => ({ display: member.employeeId, key: member.id })),
        ),
      );

      const transformed = await transformRows(
        parsedFile.rows,
        mappings,
        schema,
        lookupCache,
        dedupeResults,
      );

      const importPreview = buildImportPreview(transformed, mappings, schema);
      setTransformedRows(transformed);
      setPreview(importPreview);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build preview");
    } finally {
      setIsSubmitting(false);
    }
  }, [featureKey, mappings, parsedFile, schema, storeId]);

  const handleConfirmImport = useCallback(async () => {
    if (!schema || !preview) return;
    const batchId = crypto.randomUUID();
    const rowsToSend = rowsForImport(transformedRows);
    setStep("progress");
    setProgress({ processed: 0, total: rowsToSend.length });
    setStatusLabel("Creating customers and upserting records…");
    setError(null);

    try {
      const importResult = await executeImport({
        featureKey,
        batchId,
        storeId,
        fileName: parsedFile?.fileName,
        rows: rowsToSend,
        columnMappings: mappings,
      });

      setProgress({ processed: rowsToSend.length, total: rowsToSend.length });
      setResult(importResult);
      setStep("summary");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setProgress((current) => ({ ...current, processed: current.total }));
    }
  }, [
    featureKey,
    mappings,
    parsedFile?.fileName,
    preview,
    schema,
    storeId,
    transformedRows,
  ]);

  if (!schema) return null;

  const importRowCount = preview ? rowsForImport(transformedRows).length : 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
        onPointerDownOutside={(event) => {
          if (step === "progress") event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (step === "progress") event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Import {schema.featureLabel}</DialogTitle>
          <DialogDescription>
            Upload a spreadsheet, review column mapping, and import into your store.
          </DialogDescription>
        </DialogHeader>

        <ImportStepIndicator currentStep={step} />

        {error && step !== "upload" && (
          <div className="rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {step === "upload" && (
          <UploadStep
            schema={schema}
            onParsed={handleParsed}
            error={error}
            onError={setError}
          />
        )}

        {step === "mapping" && parsedFile && (
          <MappingStep
            schema={schema}
            mappings={mappings}
            onMappingsChange={setMappings}
            uploadedHeaders={parsedFile.headers}
            rows={parsedFile.rows}
            onContinue={() => void buildPreview()}
            onBack={() => setStep("upload")}
          />
        )}

        {step === "confirm" && preview && (
          <ConfirmationStep
            preview={preview}
            importRowCount={importRowCount}
            onConfirm={() => void handleConfirmImport()}
            onBack={() => setStep("mapping")}
            isSubmitting={isSubmitting}
          />
        )}

        {step === "progress" && (
          <ProgressStep
            processed={progress.processed}
            total={progress.total}
            statusLabel={statusLabel}
            error={error}
            onViewPartial={() => result && setStep("summary")}
          />
        )}

        {step === "summary" && result && (
          <SummaryStep
            result={result}
            transformedRows={transformedRows}
            onComplete={() => {
              onImportComplete(result);
              reset();
              onClose();
            }}
            onImportAnother={reset}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
