import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '../ui/button';

/**
 * Previous and Next through a table list's pages, with which rows are showing and
 * which page this is. Renders nothing while everything fits on one page.
 * Pass it the table list's `pagination` from useListTable.
 */
export function ListTablePagination({
  pagination,
  label,
}: {
  pagination: {
    pageNumber: number;
    pageCount: number;
    firstRowNumber: number;
    lastRowNumber: number;
    matchingCount: number;
    canPrevious: boolean;
    canNext: boolean;
    onPrevious: () => void;
    onNext: () => void;
  };
  /** Names the pages for screen readers: "Member pages". */
  label: string;
}) {
  if (pagination.pageCount <= 1) return null;

  return (
    <nav
      aria-label={label}
      className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
    >
      <p className="text-sm text-foreground/60 tabular-nums">
        {pagination.firstRowNumber}–{pagination.lastRowNumber} of{' '}
        {pagination.matchingCount}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={pagination.onPrevious}
          disabled={!pagination.canPrevious}
        >
          <ChevronLeft aria-hidden />
          Previous
        </Button>
        <span className="text-sm text-foreground/70 tabular-nums">
          Page {pagination.pageNumber} of {pagination.pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={pagination.onNext}
          disabled={!pagination.canNext}
        >
          Next
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
