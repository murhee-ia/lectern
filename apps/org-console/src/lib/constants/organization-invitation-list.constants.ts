import type {
  ListTableFilterOption,
  ListTableSortOption,
} from '@repo/lib/hooks/use-list-table';

import { INVITATION_STATUS_LABELS } from '@/lib/utils/invitations/invitation-status';

/**
 * Newest first by default: by when each invitation was first sent. Column
 * ids match the columns in organization-invitation-list.tsx.
 */
export const INVITATION_SORT_OPTIONS: [
  ListTableSortOption,
  ...ListTableSortOption[],
] = [
  {
    id: 'newest',
    label: 'Newest first',
    sorting: [{ id: 'firstInvitedAt', desc: true }],
  },
  {
    id: 'oldest',
    label: 'Oldest first',
    sorting: [{ id: 'firstInvitedAt', desc: false }],
  },
];

/** The status filter's choices: Pending, Expired, Canceled. */
export const INVITATION_STATUS_FILTER_OPTIONS: ListTableFilterOption[] =
  INVITATION_STATUS_LABELS.map((label) => ({ value: label, label }));
