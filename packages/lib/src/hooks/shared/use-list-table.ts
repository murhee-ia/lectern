'use client';

import { useEffect } from 'react';
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type FilterFn,
  type RowData,
  type SortingState,
} from '@tanstack/react-table';

/** Every list shows this many rows a page. */
export const LIST_TABLE_PAGE_SIZE = 20;

/** The one column search reads. Every list defines it; nothing else is searched. */
export const SEARCH_COLUMN_ID = 'search';

const listTableFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: { text: sortFn_text, basic: sortFn_basic },
});

type ListTableFeatures = typeof listTableFeatures;

/** What a list searches, filters, and sorts on — not what it shows. */
export type ListTableColumns<Row extends RowData> = Array<
  ColumnDef<ListTableFeatures, Row>
>;

/** One entry in a list's Sort dropdown, as the TanStack sorting it applies. */
export type ListTableSortOption = {
  id: string;
  label: string;
  sorting: SortingState;
};

/** One entry in a list's filter dropdown. */
export type ListTableFilterOption = {
  value: string;
  label: string;
};

export function createListTableColumnHelper<Row extends RowData>() {
  return createColumnHelper<ListTableFeatures, Row>();
}

/**
 * Keeps a row whose value is one of the selected values. An empty selection
 * is dropped from filter state altogether, which shows every row.
 */
export function createOneOfFilterFn<Row extends RowData>(): FilterFn<
  ListTableFeatures,
  Row
> {
  const filterFn: FilterFn<ListTableFeatures, Row> = (
    row,
    columnId,
    selectedValues: string[],
  ) => selectedValues.includes(row.getValue<string>(columnId));
  filterFn.autoRemove = (selectedValues) => !selectedValues?.length;
  return filterFn;
}

/**
 * Every word typed must appear somewhere in the row's search text, in any
 * order and any case, so "amara okafor" finds "Amara Chidi Okafor".
 */
function createSearchFilterFn<Row extends RowData>(): FilterFn<
  ListTableFeatures,
  Row
> {
  const filterFn: FilterFn<ListTableFeatures, Row> = (
    row,
    columnId,
    query: string,
  ) => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const text = String(row.getValue(columnId) ?? '').toLowerCase();
    return words.every((word) => text.includes(word));
  };
  // Only an empty box clears the search, so typing a space doesn't erase it.
  filterFn.autoRemove = (query) => typeof query !== 'string' || query === '';
  return filterFn;
}

function isSameSorting(first: SortingState, second: SortingState): boolean {
  return (
    first.length === second.length &&
    first.every(
      (sort, index) =>
        sort.id === second[index]?.id && sort.desc === second[index]?.desc,
    )
  );
}

/**
 * Search, sort, filter, pages of 20, and optional row selection for one
 * list, with the rules every list shares:
 * - Any change to the search, a filter, or the sort goes back to page 1.
 * - New data from the server (after an action) keeps the page, stepping back
 *   only if that page no longer exists.
 * - A selection survives paging and sorting, and clears when the search or
 *   a filter changes, so it never holds a row the list no longer shows.
 *
 * `columns` must keep its identity between renders — define it once, outside
 * any component — and `data` should come straight from props.
 */
export function useListTable<Row extends RowData>({
  data,
  columns,
  getRowId,
  sortOptions,
  selectable = false,
}: {
  data: Row[];
  columns: ListTableColumns<Row>;
  getRowId: (row: Row) => string;
  /** The first is the default. */
  sortOptions: readonly [ListTableSortOption, ...ListTableSortOption[]];
  selectable?: boolean;
}) {
  const [defaultSortOption] = sortOptions;

  // The default state selector returns a new table reference whenever state
  // changes, which is what lets the React Compiler see the row model change.
  const table = useTable({
    features: listTableFeatures,
    columns,
    data,
    getRowId,
    globalFilterFn: createSearchFilterFn<Row>(),
    getColumnCanGlobalFilter: (column) => column.id === SEARCH_COLUMN_ID,
    enableRowSelection: selectable,
    // TanStack would also go back to page 1 whenever new data arrives, as it
    // does after cancelling on page 2. Page 1 is only for the person's own
    // search, filter, and sort changes, set explicitly below.
    autoResetPageIndex: false,
    initialState: {
      sorting: defaultSortOption.sorting,
      pagination: { pageIndex: 0, pageSize: LIST_TABLE_PAGE_SIZE },
    },
  });

  const { globalFilter, sorting, columnFilters, pagination, rowSelection } =
    table.state;
  const searchValue = typeof globalFilter === 'string' ? globalFilter : '';
  const activeSortId = (
    sortOptions.find((option) => isSameSorting(option.sorting, sorting)) ??
    defaultSortOption
  ).id;

  const pageRows = table.getRowModel().rows;
  const matchingCount = table.getFilteredRowModel().rows.length;
  const firstRowNumber =
    pageRows.length === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;

  // New data can leave the current page empty — its last row canceled away,
  // say. Step back to the last page that still exists.
  const lastPageIndex = Math.max(table.getPageCount() - 1, 0);
  useEffect(() => {
    if (pagination.pageIndex > lastPageIndex) table.setPageIndex(lastPageIndex);
  }, [pagination.pageIndex, lastPageIndex, table]);

  const clearSelection = () => table.resetRowSelection(true);
  const backToFirstPage = () => table.setPageIndex(0);

  return {
    /** The rows on the current page, in order. */
    rows: pageRows.map((row) => row.original),
    totalCount: data.length,
    matchingCount,
    isNarrowed: searchValue.trim() !== '' || columnFilters.length > 0,

    search: {
      value: searchValue,
      onChange: (value: string) => {
        table.setGlobalFilter(value);
        backToFirstPage();
        clearSelection();
      },
    },
    sort: {
      options: sortOptions,
      activeId: activeSortId,
      onChange: (sortId: string) => {
        const option = sortOptions.find(({ id }) => id === sortId);
        if (!option) return;
        table.setSorting(option.sorting);
        backToFirstPage();
      },
    },
    getFilterValues: (columnId: string): string[] =>
      (columnFilters.find((filter) => filter.id === columnId)?.value ??
        []) as string[],
    setFilterValues: (columnId: string, values: string[]) => {
      table.getColumn(columnId)?.setFilterValue(values);
      backToFirstPage();
      clearSelection();
    },
    clearSearchAndFilters: () => {
      table.setGlobalFilter('');
      table.setColumnFilters([]);
      backToFirstPage();
      clearSelection();
    },

    pagination: {
      pageNumber: pagination.pageIndex + 1,
      pageCount: Math.max(table.getPageCount(), 1),
      firstRowNumber,
      lastRowNumber:
        firstRowNumber === 0 ? 0 : firstRowNumber + pageRows.length - 1,
      matchingCount,
      canPrevious: table.getCanPreviousPage(),
      canNext: table.getCanNextPage(),
      onPrevious: () => table.previousPage(),
      onNext: () => table.nextPage(),
    },

    selection: {
      /** Every selected row, on this page or any other. */
      selectedRows: table.getSelectedRowModel().rows.map((row) => row.original),
      isRowSelected: (row: Row) => Boolean(rowSelection?.[getRowId(row)]),
      onRowSelectedChange: (row: Row, selected: boolean) =>
        table.getRow(getRowId(row)).toggleSelected(selected),
      pageState: table.getIsAllPageRowsSelected()
        ? true
        : table.getIsSomePageRowsSelected()
          ? ('indeterminate' as const)
          : false,
      onPageSelectedChange: (selected: boolean) =>
        table.toggleAllPageRowsSelected(selected),
      clear: clearSelection,
    },
  };
}
