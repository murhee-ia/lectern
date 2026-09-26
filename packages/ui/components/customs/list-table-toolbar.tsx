'use client';

import { Search } from 'lucide-react';

import {
  DropdownSelectContent,
  DropdownSelectTrigger,
} from './dropdown-select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';

/**
 * Search, sort, and one multi-choice filter. Holds no state of its
 * own: pass it the list's `search` and `sort` from useListTable, and the
 * filter's values and setter.
 */
export function ListTableToolbar({
  search,
  searchLabel,
  searchPlaceholder,
  sort,
  filter,
}: {
  search: { 
    value: string; 
    onChange: (value: string) => void 
  };
  searchLabel: string;
  searchPlaceholder: string;
  sort: {
    options: ReadonlyArray<{ id: string; label: string }>;
    activeId: string;
    onChange: (sortId: string) => void;
  };
  filter: {
    /** "Shown on the trigger as "Role: …" or "Status: …". */
    filterLabel: string;
    /** "All roles" or "All statuses" shown while nothing is picked. */
    allLabel: string;
    /** "roles", as in "2 roles". */
    pluralLabel: string;
    options: ReadonlyArray<{ value: string; label: string }>;
    selected: string[];
    onChange: (selected: string[]) => void;
  };
}) {
  const activeSortLabel = sort.options.find(
    ({ id }) => id === sort.activeId,
  )?.label;

  const [firstSelected] = filter.selected;
  const filterSummary = !firstSelected
    ? filter.allLabel
    : filter.selected.length === 1
      ? (filter.options.find(({ value }) => value === firstSelected)?.label ??
        firstSelected)
      : `${filter.selected.length} ${filter.pluralLabel}`;

  const toggleOption = (value: string, isSelected: boolean) =>
    filter.onChange(
      isSelected
        ? [...filter.selected, value]
        : filter.selected.filter((selectedValue) => selectedValue !== value),
    );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <Input
          type="search"
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          icon={<Search />}
          value={search.value}
          onChange={(changeEvent) => search.onChange(changeEvent.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownSelectTrigger className="flex-1 sm:w-48 sm:flex-none lg:w-60">
            <span className="text-foreground/60">Sort:</span> {activeSortLabel}
          </DropdownSelectTrigger>
          <DropdownSelectContent>
            <DropdownMenuRadioGroup
              value={sort.activeId}
              onValueChange={sort.onChange}
            >
              {sort.options.map(({ id, label }) => (
                <DropdownMenuRadioItem key={id} value={id}>
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownSelectContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownSelectTrigger className="flex-1 sm:w-40 sm:flex-none lg:w-48">
            <span className="text-foreground/60">{filter.filterLabel}:</span>{' '}
            {filterSummary}
          </DropdownSelectTrigger>
          <DropdownSelectContent>
            {filter.options.map(({ value, label }) => (
              <DropdownMenuCheckboxItem
                key={value}
                checked={filter.selected.includes(value)}
                onCheckedChange={(checked) =>
                  toggleOption(value, checked === true)
                }
                // Keep the list open so several can be picked at once.
                onSelect={(selectEvent) => selectEvent.preventDefault()}
              >
                {label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={filter.selected.length === 0}
              onSelect={() => filter.onChange([])}
            >
              Clear filter
            </DropdownMenuItem>
          </DropdownSelectContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
