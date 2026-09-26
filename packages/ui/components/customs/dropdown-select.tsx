'use client';

import * as React from 'react';
import { cn } from 'cn';
import { ChevronDownIcon } from 'lucide-react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import { useKeyboardOnlyFocusReturn } from '@repo/lib/hooks/use-keyboard-only-focus-return';

/**
 * The trigger of a select-style dropdown: a field showing the current choice,
 * with a chevron that flips while the list is open. It never scales, so the
 * list attached beneath it has nothing to follow.
 */
function DropdownSelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-select-trigger"
      className={cn(
        'group flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm shadow-xs transition-[color,border-color,box-shadow] outline-none hover:border-lectern-white/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=open]:border-ring dark:bg-input/30',
        className,
      )}
      {...props}
    >
      <span className="min-w-0 truncate">{children}</span>
      <ChevronDownIcon
        aria-hidden
        className="size-4 shrink-0 text-foreground/50 transition-transform duration-200 group-data-[state=open]:rotate-180"
      />
    </DropdownMenuPrimitive.Trigger>
  );
}

/**
 * The list of a select-style dropdown: directly below its trigger and exactly
 * as wide, dropping down into place without the zoom the action menus use.
 * Fill it with the usual DropdownMenuRadioItem / DropdownMenuCheckboxItem.
 */
function DropdownSelectContent({
  className,
  sideOffset = 4,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  const returnFocusAfterKeyboardOnly = useKeyboardOnlyFocusReturn();

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-select-content"
        align="start"
        sideOffset={sideOffset}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          returnFocusAfterKeyboardOnly(event);
        }}
        className={cn(
          'z-50 max-h-(--radix-dropdown-menu-content-available-height) w-(--radix-dropdown-menu-trigger-width) overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export { DropdownSelectTrigger, DropdownSelectContent };
