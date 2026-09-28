import { SearchX } from 'lucide-react';

import { Button } from '../ui/button';

/**
 * "57 members", or "Showing 12 of 57 members" while the search or a filter
 * narrows the list. Announced to screen readers as it changes.
 */
export function ListTableCount({
  totalCount,
  matchingCount,
  isNarrowed,
  singular,
  plural,
}: {
  totalCount: number;
  matchingCount: number;
  isNarrowed: boolean;
  /** "member" */
  singular: string;
  /** "members" */
  plural: string;
}) {
  const noun = totalCount === 1 ? singular : plural;
  return (
    <p aria-live="polite" className="text-sm text-foreground/60">
      {isNarrowed
        ? `Showing ${matchingCount} of ${totalCount} ${noun}`
        : `${totalCount} ${noun}`}
    </p>
  );
}

/** Shown in place of a table list's rows when its search and filters match nothing. */
export function ListTableNoMatches({
  message,
  onClear,
}: {
  /** "No members match your search." */
  message: string;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <SearchX aria-hidden className="size-6 text-foreground/40" />
      <p className="text-sm text-foreground/70">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onClear}>
        Clear search and filters
      </Button>
    </div>
  );
}
