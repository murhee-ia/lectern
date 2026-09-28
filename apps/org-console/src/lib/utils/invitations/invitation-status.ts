import type { OrganizationInvitation } from '@repo/types/organization';
import { formatRelativeDate } from '@repo/lib/utils/formatting/date';

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

/** The three states the invitations page shows, in the order its filter lists them. */
export const INVITATION_STATUS_LABELS = [
  'Pending',
  'Expired',
  'Canceled',
] as const;

type InvitationStatusLabel = (typeof INVITATION_STATUS_LABELS)[number];

export type InvitationDisplay = {
  label: InvitationStatusLabel;
  /** Whether the link already sent still works. */
  isLinkActive: boolean;
  detail: string;
  /**
   * Cancel stops a link that still works. Resend refreshes the same
   * invitation with a new link and makes it pending again, whether it had
   * expired or been canceled.
   */
  action: 'Cancel' | 'Resend';
};

/** An invitation with what the invitations page shows for it. */
export type InvitationTableRow = OrganizationInvitation & {
  display: InvitationDisplay;
  /** "3 hours ago", or "Sep 22, 2026" once a day old. */
  firstInvitedLabel: string;
};

/**
 * Every invitation with what the page shows for it, worked out once on the
 * server. Expiry and "3 hours ago" both depend on the clock, so working them
 * out again in the browser could render different text during hydration.
 */
export function describeInvitations(
  invitations: OrganizationInvitation[],
  now: number,
): InvitationTableRow[] {
  return invitations.map((invitation) => ({
    ...invitation,
    display: describeInvitationStatus(invitation, now),
    firstInvitedLabel: formatRelativeDate(invitation.createdAt, 'short'),
  }));
}

/**
 * What the invitations page shows for one invitation, and the one action it
 * offers. Expiry comes from `expires_at` — a pending invitation whose link has
 * lapsed is still stored as 'pending'.
 */
export function describeInvitationStatus(
  invitation: Pick<OrganizationInvitation, 'status' | 'expiresAt'>,
  now: number = Date.now(),
): InvitationDisplay {
  if (invitation.status === 'canceled') {
    return {
      label: 'Canceled',
      isLinkActive: false,
      detail: 'The link no longer works',
      action: 'Resend',
    };
  }

  const remaining = new Date(invitation.expiresAt).getTime() - now;

  if (remaining > 0) {
    const daysLeft = Math.ceil(remaining / DAY_IN_MILLISECONDS);
    return {
      label: 'Pending',
      isLinkActive: true,
      detail:
        daysLeft <= 1 ? 'Expires within a day' : `Expires in ${daysLeft} days`,
      action: 'Cancel',
    };
  }

  const daysAgo = Math.floor(-remaining / DAY_IN_MILLISECONDS);
  return {
    label: 'Expired',
    isLinkActive: false,
    detail:
      daysAgo < 1
        ? 'Expired today'
        : `Expired ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`,
    action: 'Resend',
  };
}
