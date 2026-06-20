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
  ImportTransformOptions,
  ImportWizardStep,
  ParsedFile,
  TransformedRow,
} from "@/lib/import-engine/types";
import { DEFAULT_IMPORT_TRANSFORM_OPTIONS } from "@/lib/import-engine/types";
import { resolveImportPhone } from "@/lib/import-engine/utils/phoneNormaliser";
import { batchCountForRows } from "@/lib/import-engine/batch-import";
import {
  dedupeImportRows,
  executeImportInBatches,
  formatImportError,
  ImportBatchError,
  type ImportProgressUpdate,
} from "@/lib/api/import";
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
  const [progressMeta, setProgressMeta] = useState<ImportProgressUpdate>({
    processed: 0,
    total: 0,
    batchIndex: 0,
    batchCount: 0,
    successCount: 0,
    errorCount: 0,
    statusLabel: "Preparing import…",
  });
  const [progressPhase, setProgressPhase] = useState<"importing" | "failed" | "complete">(
    "importing",
  );
  const [statusLabel, setStatusLabel] = useState("Preparing import…");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transformOptions, setTransformOptions] = useState<ImportTransformOptions>(
    DEFAULT_IMPORT_TRANSFORM_OPTIONS,
  );
  const [isRefreshingPreview, setIsRefreshingPreview] = useState(false);

  const reset = useCallback(() => {
    setStep("upload");
    setParsedFile(null);
    setMappings([]);
    setPreview(null);
    setTransformedRows([]);
    setResult(null);
    setError(null);
    setProgress({ processed: 0, total: 0 });
    setProgressMeta({
      processed: 0,
      total: 0,
      batchIndex: 0,
      batchCount: 0,
      successCount: 0,
      errorCount: 0,
      statusLabel: "Preparing import…",
    });
    setProgressPhase("importing");
    setStatusLabel("Preparing import…");
    setIsSubmitting(false);
    setTransformOptions(DEFAULT_IMPORT_TRANSFORM_OPTIONS);
    setIsRefreshingPreview(false);
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

  const buildPreview = useCallback(
    async (options: ImportTransformOptions = transformOptions) => {
      if (!schema || !parsedFile) return;
      setError(null);
      setIsSubmitting(true);
      try {
        const phoneHeader = mappings.find((m) => m.matchedColumn?.dbColumn === "phone")
          ?.uploadedHeader;
        const emailHeader = mappings.find((m) => m.matchedColumn?.dbColumn === "email")
          ?.uploadedHeader;

        const dedupePayload = parsedFile.rows.map((row, rowIndex) => ({
          rowIndex,
          phone: phoneHeader ? resolveImportPhone(row[phoneHeader]) : null,
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
          options,
        );

        const importPreview = buildImportPreview(transformed, mappings, schema);
        setTransformOptions(options);
        setTransformedRows(transformed);
        setPreview(importPreview);
        setStep("confirm");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to build preview");
      } finally {
        setIsSubmitting(false);
        setIsRefreshingPreview(false);
      }
    },
    [featureKey, mappings, parsedFile, schema, storeId, transformOptions],
  );

  const handleTransformOptionsChange = useCallback(
    (options: ImportTransformOptions) => {
      setIsRefreshingPreview(true);
      void buildPreview(options);
    },
    [buildPreview],
  );

  const handleConfirmImport = async () => {
    if (!schema || !preview) return;
    const batchId = crypto.randomUUID();
    const rowsToSend = rowsForImport(transformedRows);
    const batchCount = batchCountForRows(rowsToSend.length);
    setStep("progress");
    setProgressPhase("importing");
    setProgress({ processed: 0, total: rowsToSend.length });
    setProgressMeta({
      processed: 0,
      total: rowsToSend.length,
      batchIndex: 0,
      batchCount,
      successCount: 0,
      errorCount: 0,
      statusLabel:
        batchCount > 1
          ? `Starting import in ${batchCount} batches…`
          : "Saving rows to your store…",
    });
    setStatusLabel(
      batchCount > 1
        ? `Starting import in ${batchCount} batches…`
        : "Saving rows to your store…",
    );
    setError(null);

    try {
      const importResult = await executeImportInBatches(
        {
          featureKey,
          batchId,
          storeId,
          fileName: parsedFile?.fileName,
          rows: rowsToSend,
          columnMappings: mappings,
        },
        (update) => {
          setProgress({ processed: update.processed, total: update.total });
          setProgressMeta(update);
          setStatusLabel(update.statusLabel);
        },
      );

      setProgress({ processed: rowsToSend.length, total: rowsToSend.length });
      setProgressPhase("complete");
      setResult(importResult);
      setStep("summary");
    } catch (err) {
      setProgressPhase("failed");
      if (err instanceof ImportBatchError && err.partialResult) {
        setResult(err.partialResult);
      }
      setError(formatImportError(err));
    }
  };

  if (!schema) return null;

  const importRowCount = preview ? rowsForImport(transformedRows).length : 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent
        className="top-[4vh] flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-4xl translate-x-[-50%] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        onPointerDownOutside={(event) => {
          if (step === "progress") event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (step === "progress") event.preventDefault();
        }}
      >
        <div className="shrink-0 space-y-4 border-b border-border px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle>Import {schema.featureLabel}</DialogTitle>
            <DialogDescription>
              Upload a spreadsheet, review column mapping, and import into your store.
            </DialogDescription>
          </DialogHeader>
          <ImportStepIndicator currentStep={step} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {error && step !== "upload" && step !== "progress" && (
            <div className="mb-4 rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
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
              isSubmitting={isSubmitting}
            />
          )}

          {step === "confirm" && preview && (
            <ConfirmationStep
              preview={preview}
              importRowCount={importRowCount}
              transformOptions={transformOptions}
              onTransformOptionsChange={handleTransformOptionsChange}
              isRefreshing={isRefreshingPreview}
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
              batchIndex={progressMeta.batchIndex}
              batchCount={progressMeta.batchCount}
              successCount={progressMeta.successCount}
              errorCount={progressMeta.errorCount}
              phase={progressPhase}
              error={error}
              onViewPartial={
                result && result.successCount > 0 ? () => setStep("summary") : undefined
              }
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
