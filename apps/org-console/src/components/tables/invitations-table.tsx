'use client';

import { useState, useTransition } from 'react';

import {
  createListTableColumnHelper,
  createOneOfFilterFn,
  SEARCH_COLUMN_ID,
  useListTable,
} from '@repo/lib/hooks/use-list-table';
import { useOrganizationAccess } from '@repo/lib/hooks/use-organization-access';
import { formatOrganizationRole } from '@repo/lib/utils/organization/members';
import { ListTableFrame } from '@repo/ui/components/customs/list-table-frame';
import { ListTablePagination } from '@repo/ui/components/customs/list-table-pagination';
import {
  ListTableCount,
  ListTableNoMatches,
} from '@repo/ui/components/customs/list-table-summary';
import { ListTableToolbar } from '@repo/ui/components/customs/list-table-toolbar';
import { ResponsiveTableLayout } from '@repo/ui/components/customs/responsive-table-layout';
import { Button } from '@repo/ui/components/ui/button';

import {
  cancelInvitationsAction,
  resendInvitationsAction,
} from '@/lib/actions/invitations.actions';
import {
  INVITATION_SORT_OPTIONS,
  INVITATION_STATUS_FILTER_OPTIONS,
} from '@/lib/constants/organization-invitation-list.constants';
import type { InvitationTableRow } from '@/lib/utils/invitations/invitation-status';
import { OrganizationInvitationBulkBar } from '@/components/organization-invitation-bulk-bar';

const columnHelper = createListTableColumnHelper<InvitationTableRow>();

// What the list searches, filters, and sorts on. Defined once, here, so it
// keeps its identity between renders.
const columns = columnHelper.columns([
  columnHelper.accessor((invitation) => invitation.email, {
    id: SEARCH_COLUMN_ID,
    enableSorting: false,
  }),
  columnHelper.accessor((invitation) => invitation.display.label, {
    id: 'status',
    filterFn: createOneOfFilterFn<InvitationTableRow>(),
  }),
  columnHelper.accessor((invitation) => invitation.createdAt, {
    id: 'firstInvitedAt',
    sortFn: 'basic',
  }),
]);

/**
 * Every pending and canceled invitation, however old — the organization's
 * invitation log. Nothing is ever deleted; only the status changes. Search by
 * email, sort by when each was first sent, filter by status, 20 to a page,
 * and select several to cancel or resend at once. Each row's expiry and
 * dates arrive already worked out on the server, and each action's result
 * shows here rather than as a toast, which arrives with onboarding.
 */
export function OrganizationInvitationTable({
  invitations,
}: {
  invitations: InvitationTableRow[];
}) {
  const list = useListTable({
    data: invitations,
    columns,
    getRowId: (invitation) => invitation.id,
    sortOptions: INVITATION_SORT_OPTIONS,
    selectable: true,
  });
  const { organization } = useOrganizationAccess();

  // Which action is running: a row's id, or a bulk action. One at a time.
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const runAction = (
    key: string,
    action: () => Promise<{ error?: string }>,
    onSuccess?: () => void,
  ) => {
    setActionError(null);
    setPendingKey(key);
    startTransition(async () => {
      const result = await action();
      if (result.error) setActionError(result.error);
      else onSuccess?.();
      setPendingKey(null);
    });
  };

  const cancelInvitations = (key: string, invitationIds: string[]) =>
    runAction(key, () =>
      cancelInvitationsAction(organization.id, invitationIds),
    );
  const resendInvitations = (key: string, invitationIds: string[]) =>
    runAction(key, () =>
      resendInvitationsAction(organization.id, invitationIds),
    );

  return (
    <section
      aria-labelledby="invitations-heading"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <h3
          id="invitations-heading"
          className="text-base font-semibold text-foreground"
        >
          Invitations
        </h3>
        <p className="text-sm text-foreground/60">
          Every invitation sent from this organization. Once someone accepts,
          they move to the members list.
        </p>
      </div>

      {invitations.length === 0 ? (
        <p className="glass-card text-sm text-foreground/60">
          No invitations sent yet.
        </p>
      ) : (
        <ListTableFrame>
          <ListTableToolbar
            search={list.search}
            searchLabel="Search invitations"
            searchPlaceholder="Search by email"
            sort={list.sort}
            filter={{
              filterLabel: 'Status',
              allLabel: 'All statuses',
              pluralLabel: 'statuses',
              options: INVITATION_STATUS_FILTER_OPTIONS,
              selected: list.getFilterValues('status'),
              onChange: (statuses) => list.setFilterValues('status', statuses),
            }}
          />

          <ListTableCount
            totalCount={list.totalCount}
            matchingCount={list.matchingCount}
            isNarrowed={list.isNarrowed}
            singular="invitation"
            plural="invitations"
          />

          <OrganizationInvitationBulkBar
            selectedInvitations={list.selection.selectedRows}
            pageState={list.selection.pageState}
            onPageSelectedChange={list.selection.onPageSelectedChange}
            onClear={list.selection.clear}
            pendingAction={
              pendingKey === 'bulk-cancel'
                ? 'cancel'
                : pendingKey === 'bulk-resend'
                  ? 'resend'
                  : null
            }
            onCancel={(invitationIds) =>
              runAction(
                'bulk-cancel',
                () => cancelInvitationsAction(organization.id, invitationIds),
                list.selection.clear,
              )
            }
            onResend={(invitationIds) =>
              runAction(
                'bulk-resend',
                () => resendInvitationsAction(organization.id, invitationIds),
                list.selection.clear,
              )
            }
          />

          {actionError && (
            <p role="alert" className="text-sm text-destructive">
              {actionError}
            </p>
          )}

          <ResponsiveTableLayout
            rows={list.rows}
            getRowKey={(invitation) => invitation.id}
            scrollResetKey={list.pagination.pageNumber}
            selection={{
              isRowSelected: list.selection.isRowSelected,
              onRowSelectedChange: list.selection.onRowSelectedChange,
              getRowLabel: (invitation) =>
                `Select the invitation to ${invitation.email}`,
            }}
            empty={
              <ListTableNoMatches
                message="No invitations match your search."
                onClear={list.clearSearchAndFilters}
              />
            }
            columns={[
              {
                id: 'email',
                header: 'Email',
                width: 'minmax(0,2fr)',
                placement: 'primary',
                cell: (invitation) => (
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-foreground">
                      {invitation.email}
                    </span>
                    <span className="text-xs text-foreground/60">
                      as {formatOrganizationRole(invitation.role)}
                    </span>
                  </div>
                ),
              },
              {
                id: 'firstInvited',
                header: 'First invited',
                width: 'minmax(0,1fr)',
                placement: 'detail',
                cell: (invitation) => (
                  <>
                    {/* Resending refreshes this same invitation, so its date
                        stays the first time it was sent. */}
                    <span className="md:sr-only">First invited </span>
                    {invitation.firstInvitedLabel}
                  </>
                ),
              },
              {
                id: 'status',
                header: 'Status',
                width: 'minmax(0,1.5fr)',
                placement: 'detail',
                cell: ({ display }) => (
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        display.isLinkActive ? 'badge badge-accent' : 'badge'
                      }
                    >
                      {display.label}
                    </span>
                    <span className="text-xs text-foreground/60">
                      {display.detail}
                    </span>
                  </span>
                ),
              },
              {
                id: 'action',
                width: '6rem',
                placement: 'action',
                cell: ({ id, display }) => (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pendingKey !== null}
                    onClick={() =>
                      display.action === 'Cancel'
                        ? cancelInvitations(id, [id])
                        : resendInvitations(id, [id])
                    }
                  >
                    {pendingKey === id
                      ? display.action === 'Cancel'
                        ? 'Canceling…'
                        : 'Resending…'
                      : display.action}
                  </Button>
                ),
              },
            ]}
          />

          <ListTablePagination
            pagination={list.pagination}
            label="Invitation pages"
          />
        </ListTableFrame>
      )}
    </section>
  );
}
