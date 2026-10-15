import React, { useMemo, useState } from 'react';
import {
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Badge } from '../ui/badge';
import { EmptyState, ErrorState, TableSkeleton } from './StateViews';
import { cn } from '../../lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

export interface DataTableColumn<TData> {
  id: string;
  header: string;
  cell: (row: TData) => React.ReactNode;
  sortAccessor?: (row: TData) => string | number;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
}

export interface DataTableFilterOption {
  label: string;
  value: string;
}

export interface DataTableFilter {
  id: string;
  label: string;
  value: string;
  options: DataTableFilterOption[];
  onChange: (value: string) => void;
}

export interface DataTableProps<TData> {
  data: TData[];
  columns: DataTableColumn<TData>[];
  getRowId: (row: TData) => string;

  // Search
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  searchMatcher?: (row: TData, query: string) => boolean;

  // Filters
  filters?: DataTableFilter[];
  onResetFilters?: () => void;

  // Sorting
  defaultSortColumnId?: string;
  defaultSortDirection?: 'asc' | 'desc';

  // Pagination
  defaultPageSize?: number;
  pageSizeOptions?: number[];

  // Selection & Bulk Actions
  enableRowSelection?: boolean;
  selectedRowIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  bulkActions?: (
    selectedRows: TData[],
    clearSelection: () => void,
  ) => React.ReactNode;

  // Toolbar slot
  toolbarActions?: React.ReactNode;

  // States
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

export function DataTable<TData>({
  data,
  columns,
  getRowId,
  searchQuery: controlledSearch,
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm...',
  searchMatcher,
  filters = [],
  onResetFilters,
  defaultSortColumnId,
  defaultSortDirection = 'asc',
  defaultPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
  enableRowSelection = false,
  selectedRowIds: controlledSelectedIds,
  onSelectionChange,
  bulkActions,
  toolbarActions,
  isLoading = false,
  error = null,
  onRetry,
  emptyTitle = 'Không tìm thấy dữ liệu phù hợp',
  emptyDescription = 'Chưa có bản ghi nào hoặc không có kết quả khớp với bộ lọc hiện tại.',
  emptyActionLabel,
  onEmptyAction,
}: DataTableProps<TData>) {
  const [internalSearch, setInternalSearch] = useState('');
  const [sortColumnId, setSortColumnId] = useState<string | null>(
    defaultSortColumnId ?? null,
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    defaultSortColumnId ? defaultSortDirection : null,
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);

  const search = controlledSearch !== undefined ? controlledSearch : internalSearch;
  const setSearch = (val: string) => {
    setPage(1);
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalSearch(val);
    }
  };

  const selectedIds =
    controlledSelectedIds !== undefined ? controlledSelectedIds : internalSelectedIds;
  const setSelectedIds = (ids: string[]) => {
    if (onSelectionChange) {
      onSelectionChange(ids);
    } else {
      setInternalSelectedIds(ids);
    }
  };

  const hasActiveFilters =
    search.trim().length > 0 ||
    filters.some((f) => f.value !== '' && f.value !== 'all');

  const handleResetAll = () => {
    setSearch('');
    filters.forEach((f) => f.onChange('all'));
    onResetFilters?.();
    setPage(1);
  };

  // 1. Search filtering
  const searchedData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !searchMatcher) return data;
    return data.filter((row) => searchMatcher(row, q));
  }, [data, search, searchMatcher]);

  // 2. Sorting
  const sortedData = useMemo(() => {
    if (!sortColumnId || !sortDirection) return searchedData;
    const col = columns.find((c) => c.id === sortColumnId);
    if (!col || !col.sortAccessor) return searchedData;
    const accessor = col.sortAccessor;

    return [...searchedData].sort((a, b) => {
      const valA = accessor(a);
      const valB = accessor(b);
      if (valA === valB) return 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      const cmp = strA.localeCompare(strB, 'vi');
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [searchedData, sortColumnId, sortDirection, columns]);

  // 3. Pagination
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedData = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, safePage, pageSize]);

  const handleToggleSort = (col: DataTableColumn<TData>) => {
    if (!col.sortable) return;
    if (sortColumnId !== col.id) {
      setSortColumnId(col.id);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortColumnId(null);
      setSortDirection(null);
    }
  };

  // Selection helpers
  const pageRowIds = paginatedData.map(getRowId);
  const isAllPageSelected =
    pageRowIds.length > 0 && pageRowIds.every((id) => selectedIds.includes(id));
  const isSomePageSelected =
    pageRowIds.some((id) => selectedIds.includes(id)) && !isAllPageSelected;

  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedIds(selectedIds.filter((id) => !pageRowIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...pageRowIds]));
      setSelectedIds(merged);
    }
  };

  const handleToggleRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedRows = useMemo(
    () => data.filter((row) => selectedIds.includes(getRowId(row))),
    [data, selectedIds, getRowId],
  );

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safePage * pageSize);

  return (
    <div className="space-y-3">
      {/* Toolbar: Search, Filters, and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-lg border border-border bg-card p-3.5 shadow-xs">
        <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-xs">
            <Search
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="pl-9 pr-8 h-9 text-xs sm:text-sm"
            />
            {search.length > 0 && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Selects */}
          {filters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden xl:flex items-center gap-1 text-xs font-medium text-muted-foreground mr-0.5">
                <SlidersHorizontal size={13} />
                <span>Lọc:</span>
              </div>
              {filters.map((filter) => (
                <div key={filter.id} className="w-full sm:w-auto min-w-[155px]">
                  <Select
                    aria-label={filter.label}
                    value={filter.value}
                    onChange={(e) => {
                      setPage(1);
                      filter.onChange(e.target.value);
                    }}
                    className="h-9 text-xs"
                  >
                    {filter.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetAll}
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw size={13} />
                  <span>Đặt lại</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Right Toolbar Actions */}
        {toolbarActions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {toolbarActions}
          </div>
        )}
      </div>

      {/* Contextual Bulk Actions Bar */}
      {enableRowSelection && selectedRows.length > 0 && bulkActions && (
        <div
          role="region"
          aria-label="Thao tác hàng loạt"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-xs"
        >
          <div className="flex items-center gap-2">
            <Badge variant="primary" className="font-mono">
              Đã chọn {selectedRows.length}
            </Badge>
            <span className="text-foreground font-medium">
              bản ghi trong danh sách
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-muted-foreground hover:text-foreground underline ml-1 cursor-pointer"
            >
              Bỏ chọn tất cả
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {bulkActions(selectedRows, () => setSelectedIds([]))}
          </div>
        </div>
      )}

      {/* Table or State Views */}
      {isLoading ? (
        <TableSkeleton
          columns={columns.length + (enableRowSelection ? 1 : 0)}
          rows={Math.min(pageSize, 6)}
        />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : sortedData.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          secondaryActionLabel={hasActiveFilters ? 'Xóa bộ lọc tìm kiếm' : undefined}
          onSecondaryAction={hasActiveFilters ? handleResetAll : undefined}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {enableRowSelection && (
                  <TableHead className="w-10 px-3 text-center">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả bản ghi trên trang này"
                      checked={isAllPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomePageSelected;
                      }}
                      onChange={handleToggleSelectAllPage}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-ring cursor-pointer align-middle"
                    />
                  </TableHead>
                )}

                {columns.map((col) => {
                  const isSorted = sortColumnId === col.id;
                  const ariaSort: 'ascending' | 'descending' | 'none' | undefined =
                    col.sortable
                      ? isSorted
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined;

                  return (
                    <TableHead
                      key={col.id}
                      aria-sort={ariaSort}
                      className={cn(
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right',
                        col.headerClassName,
                      )}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleToggleSort(col)}
                          className={cn(
                            'inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1 -mx-1 py-0.5 transition-colors cursor-pointer select-none',
                            isSorted && 'text-foreground',
                          )}
                        >
                          <span>{col.header}</span>
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp size={13} className="text-primary shrink-0" />
                            ) : (
                              <ArrowDown size={13} className="text-primary shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown size={13} className="opacity-45 shrink-0" />
                          )}
                        </button>
                      ) : (
                        <span>{col.header}</span>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedData.map((row) => {
                const rowId = getRowId(row);
                const isSelected = selectedIds.includes(rowId);

                return (
                  <TableRow
                    key={rowId}
                    data-state={isSelected ? 'selected' : undefined}
                  >
                    {enableRowSelection && (
                      <TableCell className="w-10 px-3 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Chọn dòng ${rowId}`}
                          checked={isSelected}
                          onChange={() => handleToggleRow(rowId)}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-ring cursor-pointer align-middle"
                        />
                      </TableCell>
                    )}

                    {columns.map((col) => (
                      <TableCell
                        key={col.id}
                        className={cn(
                          col.align === 'center' && 'text-center',
                          col.align === 'right' && 'text-right',
                          col.className,
                        )}
                      >
                        {col.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3">
              <span className="tabular-nums">
                Hiển thị{' '}
                <strong className="font-semibold text-foreground">
                  {startItem}–{endItem}
                </strong>{' '}
                trong tổng số{' '}
                <strong className="font-semibold text-foreground">
                  {totalItems}
                </strong>{' '}
                bản ghi
              </span>

              <div className="flex items-center gap-1.5">
                <label htmlFor="datatable-page-size" className="text-muted-foreground">
                  Số dòng:
                </label>
                <select
                  id="datatable-page-size"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-7 rounded border border-input bg-card px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  {pageSizeOptions.map((sz) => (
                    <option key={sz} value={sz}>
                      {sz} / trang
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1">
              <span className="mr-2 tabular-nums">
                Trang{' '}
                <strong className="font-semibold text-foreground">{safePage}</strong> /{' '}
                {totalPages}
              </span>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={safePage <= 1}
                onClick={() => setPage(1)}
                aria-label="Trang đầu"
              >
                <ChevronsLeft size={14} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Trang trước"
              >
                <ChevronLeft size={14} />
              </Button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - safePage) <= 1,
                )
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev !== undefined && p - prev > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && (
                        <span className="px-1 text-muted-foreground">…</span>
                      )}
                      <Button
                        type="button"
                        variant={p === safePage ? 'primary' : 'outline'}
                        size="icon"
                        className="h-7 w-7 text-xs font-mono"
                        onClick={() => setPage(p)}
                        aria-label={`Trang ${p}`}
                        aria-current={p === safePage ? 'page' : undefined}
                      >
                        {p}
                      </Button>
                    </React.Fragment>
                  );
                })}

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Trang tiếp"
              >
                <ChevronRight size={14} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={safePage >= totalPages}
                onClick={() => setPage(totalPages)}
                aria-label="Trang cuối"
              >
                <ChevronsRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
