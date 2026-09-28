import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { cn } from 'cn';

import { Checkbox } from '../ui/checkbox';

export type ResponsiveTableColumn<Row> = {
  id: string;
  /** The heading shown from md up. Leave it out for an action column. */
  header?: ReactNode;
  /** The column's width from md up, as a grid track: 'minmax(0,2fr)', '6rem'. */
  width: string;
  /**
   * Where the cell sits below md, where a row stacks: `primary` leads it,
   * `action` sits to its right, and every `detail` shares one wrapping line
   * beneath. From md up they're columns in that same order.
   */
  placement: 'primary' | 'detail' | 'action';
  cell: (row: Row) => ReactNode;
};

/**
 * The one table layout every list of rows shares: column headings from md up,
 * and rows that restack below it. It owns the layout only; what each cell
 * shows, and any searching, sorting, or filtering, stays with the caller. No
 * hooks and no 'use client', so it renders on the server when a Server
 * Component uses it and on the client when a Client Component does.
 *
 * Inside a height-capped column (ListTableFrame), the rows scroll under the
 * headings while the controls around the table stay put. Anywhere else it
 * takes its natural height.
 */
export function ResponsiveTableLayout<Row>({
  columns,
  rows,
  getRowKey,
  empty,
  indentDetails = false,
  highlightRowOnHover = false,
  selection,
  scrollResetKey,
}: {
  columns: ReadonlyArray<ResponsiveTableColumn<Row>>;
  rows: ReadonlyArray<Row>;
  getRowKey: (row: Row) => string;
  /** Shown beneath the headings when there are no rows. */
  empty: ReactNode;
  /** Lines the details up under the name when the primary cell leads with a small avatar. */
  indentDetails?: boolean;
  /** For rows that open something when clicked. */
  highlightRowOnHover?: boolean;
  /**
   * A checkbox at the start of every row, for bulk actions. From a Client
   * Component only, since it passes functions.
   */
  selection?: {
    isRowSelected: (row: Row) => boolean;
    onRowSelectedChange: (row: Row, selected: boolean) => void;
    /** What the checkbox says to a screen reader: "Select the invitation to …". */
    getRowLabel: (row: Row) => string;
  };
  /**
   * The rows start back at the top of their scroll whenever this changes.
   * Pass the page number, so moving to another page starts at its first row.
   */
  scrollResetKey?: string | number;
}) {
  const primary = columns.find((column) => column.placement === 'primary');
  const details = columns.filter((column) => column.placement === 'detail');
  const action = columns.find((column) => column.placement === 'action');
  const orderedColumns = [primary, ...details, action].filter(
    (column): column is ResponsiveTableColumn<Row> => column !== undefined,
  );

  // Tailwind can't see a class built at runtime, so the widths travel in a CSS
  // variable that one fixed class reads.
  const gridStyle = {
    '--table-columns': [
      ...(selection ? ['1rem'] : []),
      ...orderedColumns.map((column) => column.width),
    ].join(' '),
  } as CSSProperties;
  // Below md: [checkbox] primary [action] on the first line.
  const phoneColumns = selection
    ? action
      ? 'grid-cols-[auto_minmax(0,1fr)_auto]'
      : 'grid-cols-[auto_minmax(0,1fr)]'
    : action
      ? 'grid-cols-[minmax(0,1fr)_auto]'
      : 'grid-cols-1';
  const gridColumns = cn(phoneColumns, 'md:grid-cols-(--table-columns)');

  return (
    // min-h-0 lets the card shrink inside a height-capped column, and the
    // rows below are what scroll when it does; the headings stay.
    <div className="glass-card flex min-h-0 flex-col overflow-hidden p-0">
      <div
        aria-hidden
        style={gridStyle}
        className={cn(
          'hidden shrink-0 gap-x-4 border-b border-lectern-white/10 px-4 py-3 text-xs font-semibold tracking-wide text-foreground/50 uppercase md:grid',
          gridColumns,
        )}
      >
        {selection && <span />}
        {orderedColumns.map((column) => (
          <span key={column.id}>{column.header}</span>
        ))}
      </div>

      {rows.length === 0 ? (
        empty
      ) : (
        <ul
          key={scrollResetKey}
          className="min-h-0 divide-y divide-lectern-white/10 overflow-y-auto overscroll-contain"
        >
          {rows.map((row) => {
            const isSelected = selection?.isRowSelected(row) ?? false;
            return (
              <li
                key={getRowKey(row)}
                data-selected={isSelected ? '' : undefined}
                style={gridStyle}
                className={cn(
                  'relative grid items-center gap-x-3 gap-y-2 px-4 py-3 md:gap-x-4',
                  gridColumns,
                  // Only the background animates. The last row's border colour
                  // falls back to the text colour, so animating border colours
                  // too flashes a white divider when sorting moves it up.
                  highlightRowOnHover &&
                    'transition-[background-color] hover:bg-lectern-white/5',
                  'data-selected:bg-lectern-white/[0.07]',
                )}
              >
                {selection && (
                  <div className="relative z-10 col-start-1 row-start-1 flex">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        selection.onRowSelectedChange(row, checked === true)
                      }
                      aria-label={selection.getRowLabel(row)}
                    />
                  </div>
                )}

                {primary && <div className="min-w-0">{primary.cell(row)}</div>}

                {details.length > 0 && (
                  <div
                    className={cn(
                      'flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground/70 md:contents',
                      // Beneath the primary cell, past the checkbox when there is one.
                      selection
                        ? 'col-start-2 col-end-[-1]'
                        : 'col-start-1 col-end-[-1]',
                      indentDetails && 'pl-12',
                    )}
                  >
                    {details.map((column, index) => (
                      <Fragment key={column.id}>
                        {index > 0 && (
                          <span aria-hidden className="md:hidden">
                            ·
                          </span>
                        )}
                        <span className="min-w-0">{column.cell(row)}</span>
                      </Fragment>
                    ))}
                  </div>
                )}

                {/* Above the row's stretched button, when it has one, so the
                  action keeps working on its own. */}
                {action && (
                  <div
                    className={cn(
                      'relative z-10 row-start-1 justify-self-end md:col-start-[-2]',
                      selection ? 'col-start-3' : 'col-start-2',
                    )}
                  >
                    {action.cell(row)}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
