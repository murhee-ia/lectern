import type { ReactNode } from 'react';
import { cn } from 'cn';

/**
 * The section a paged list sits in: its toolbar, count, table, and pager,
 * never taller than the screen. When the rows don't fit, the table's rows
 * scroll while everything else stays in view, so the pager is always at the
 * bottom of the screen rather than the bottom of the page.
 */
export function ListTableFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col gap-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
