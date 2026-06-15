"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import type { VisitListItem } from "@/types";
import { buildVisitColumns } from "./visits-columns";
import { CustomerProfileDialog } from "@/components/customers/CustomerProfileDialog";
import { VisitDetailDialog } from "./VisitDetailDialog";
import { VisitsTableToolbar } from "./VisitsTableToolbar";
import { VisitsTablePagination } from "./VisitsTablePagination";
import { VisitColumnFilterHeader } from "./VisitsTableHeaderFilters";
import type { VisitsTableProps } from "./types";

export function VisitsTable({
  copy,
  emptyMessage,
  searchPlaceholder,
  previousLabel,
  nextLabel,
  yesLabel,
  noLabel,
  data,
  total,
  page,
  pageSize,
  search,
  isSearching,
  onSearchChange,
  onPageChange,
  onImportCsv,
  onOpenImport,
  importLabel,
  showImport = false,
  isImportingCsv,
  importStatusMessage,
  importStatusTone,
  fieldLabels,
  isLoading,
  columnFilters = {},
  onColumnFiltersChange,
  staffOptions = [],
  filterAllLabel = "All",
  showCustomerMerge = false,
  storeId,
  canAssign = false,
  onAssigned,
}: VisitsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedVisit, setSelectedVisit] = useState<VisitListItem | null>(null);
  const [profileVisit, setProfileVisit] = useState<VisitListItem | null>(null);

  const productLabels = fieldLabels.productsExplored.options;

  const columns = useMemo(
    () =>
      buildVisitColumns({
        copy,
        fieldLabels,
        productLabels,
        yesLabel,
        noLabel,
        onCustomerClick: setProfileVisit,
        viewProfileLabel: copy.customerProfile?.title ?? "Customer profile",
      }),
    [copy, fieldLabels, productLabels, yesLabel, noLabel],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const showingLabel = copy.showing
    .replace("{from}", String(from))
    .replace("{to}", String(to))
    .replace("{total}", String(total));

  const pageLabel = copy.page.replace("{page}", String(page));

  return (
    <div className="space-y-4">
      <VisitsTableToolbar
        copy={copy}
        total={total}
        searchPlaceholder={searchPlaceholder}
        search={search}
        isSearching={isSearching}
        onSearchChange={onSearchChange}
        onImport={onImportCsv}
        onOpenImport={onOpenImport}
        importLabel={importLabel}
        showImport={showImport}
        importDisabled={false}
        isImporting={isImportingCsv}
        importStatusMessage={importStatusMessage}
        importStatusTone={importStatusTone}
      />

      {isLoading ? (
        <div aria-live="polite" aria-busy="true">
          <Skeleton className="h-48 rounded-card" />
        </div>
      ) : data.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="overflow-x-auto border border-border bg-surface-card shadow-card">
          <Table className="min-w-[2400px]">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    const headerLabel = header.column.columnDef.header;
                    const labelText =
                      typeof headerLabel === "string" ? headerLabel : "";

                    return (
                      <TableHead key={header.id} className="whitespace-nowrap">
                        {header.isPlaceholder ? null : onColumnFiltersChange &&
                          labelText ? (
                          <VisitColumnFilterHeader
                            label={labelText}
                            columnId={header.column.id}
                            filters={columnFilters}
                            onFiltersChange={onColumnFiltersChange}
                            staffOptions={staffOptions}
                            fieldLabels={fieldLabels}
                            filterAllLabel={filterAllLabel}
                          />
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  tabIndex={0}
                  aria-label={`View visit details for ${row.original.customerName}. Click the customer name for their profile.`}
                  onClick={() => setSelectedVisit(row.original)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedVisit(row.original);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <VisitsTablePagination
        showingLabel={showingLabel}
        pageLabel={pageLabel}
        previousLabel={previousLabel}
        nextLabel={nextLabel}
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />

      <CustomerProfileDialog
        visit={profileVisit}
        copy={copy.customerProfile}
        fieldLabels={fieldLabels}
        productLabels={productLabels}
        onClose={() => setProfileVisit(null)}
        onViewVisit={(visitId) => {
          const match = data.find((row) => row.id === visitId);
          setProfileVisit(null);
          if (match) setSelectedVisit(match);
        }}
        showMerge={showCustomerMerge}
        storeId={storeId}
      />

      <VisitDetailDialog
        visit={selectedVisit}
        copy={copy}
        fieldLabels={fieldLabels}
        productLabels={productLabels}
        yesLabel={yesLabel}
        noLabel={noLabel}
        onClose={() => setSelectedVisit(null)}
        canAssign={canAssign}
        storeId={storeId}
        onAssigned={() => {
          onAssigned?.();
          setSelectedVisit(null);
        }}
      />
    </div>
  );
}

export type { VisitsTableProps } from "./types";
