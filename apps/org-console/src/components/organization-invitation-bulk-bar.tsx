'use client';

import { Button } from '@repo/ui/components/ui/button';
import { Checkbox } from '@repo/ui/components/ui/checkbox';

import type { InvitationTableRow } from '@/lib/utils/invitations/invitation-status';

/**
 * Select this page's invitations, and act on every selected one at once.
 * Each button acts only on the selected invitations it applies to: Cancel on
 * the ones whose link still works, Resend on the expired and canceled ones.
 */
export function OrganizationInvitationBulkBar({
  selectedInvitations,
  pageState,
  onPageSelectedChange,
  onClear,
  onCancel,
  onResend,
  pendingAction,
}: {
  /** Every selected invitation, on this page or any other. */
  selectedInvitations: InvitationTableRow[];
  pageState: boolean | 'indeterminate';
  onPageSelectedChange: (selected: boolean) => void;
  onClear: () => void;
  onCancel: (invitationIds: string[]) => void;
  onResend: (invitationIds: string[]) => void;
  /** Which bulk action is running, if one is. */
  pendingAction: 'cancel' | 'resend' | null;
}) {
  const selectedCount = selectedInvitations.length;
  const cancelableIds = selectedInvitations
    .filter(({ display }) => display.action === 'Cancel')
    .map(({ id }) => id);
  const resendableIds = selectedInvitations
    .filter(({ display }) => display.action === 'Resend')
    .map(({ id }) => id);
  const isBusy = pendingAction !== null;

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-2">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground/80">
        <Checkbox
          checked={pageState}
          onCheckedChange={(checked) => onPageSelectedChange(checked === true)}
        />
        Select this page
      </label>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span aria-live="polite" className="text-sm text-foreground/60">
            {selectedCount} selected
          </span>
          <Button
            type="button"
            size="sm"
            disabled={isBusy || cancelableIds.length === 0}
            onClick={() => onCancel(cancelableIds)}
            aria-label={`Cancel ${cancelableIds.length} of the selected invitations`}
          >
            {pendingAction === 'cancel'
              ? 'Canceling…'
              : `Cancel ${cancelableIds.length}`}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isBusy || resendableIds.length === 0}
            onClick={() => onResend(resendableIds)}
            aria-label={`Resend ${resendableIds.length} of the selected invitations`}
          >
            {pendingAction === 'resend'
              ? 'Resending…'
              : `Resend ${resendableIds.length}`}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isBusy}
            onClick={onClear}
          >
            Clear selection
          </Button>
        </div>
      )}
    </div>
  );
}
