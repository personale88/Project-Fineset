import type { Content } from "@/content/en";
import type { VisitListItem, VisitsColumnFilters } from "@/types";

export type VisitFormFields = Content["visitForm"]["fields"];
export type VisitsCopy = Content["store"]["visits"];

export interface VisitsTableProps {
  copy: VisitsCopy & { showing: string; page: string };
  emptyMessage: string;
  searchPlaceholder: string;
  previousLabel: string;
  nextLabel: string;
  yesLabel: string;
  noLabel: string;
  data: VisitListItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  isSearching?: boolean;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onImportCsv: (file: File) => void;
  onOpenImport?: () => void;
  importLabel?: string;
  showImport?: boolean;
  isImportingCsv: boolean;
  importStatusMessage?: string;
  importStatusTone?: "default" | "success" | "error";
  fieldLabels: VisitFormFields;
  isLoading?: boolean;
  columnFilters?: VisitsColumnFilters;
  onColumnFiltersChange?: (filters: VisitsColumnFilters) => void;
  staffOptions?: Array<{ id: string; name: string }>;
  filterAllLabel?: string;
  showCustomerMerge?: boolean;
  storeId?: string;
  canAssign?: boolean;
  onAssigned?: () => void;
  highlightRecordId?: string;
}

export interface VisitColumnLabels {
  copy: VisitsTableProps["copy"];
  fieldLabels: VisitFormFields;
  productLabels: Record<string, string>;
  yesLabel: string;
  noLabel: string;
  onCustomerClick?: (visit: import("@/types").VisitListItem) => void;
  viewProfileLabel?: string;
}
