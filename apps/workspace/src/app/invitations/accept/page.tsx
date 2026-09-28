import { getCurrentUser } from '@repo/server/auth/queries';
import { getOrganizationInvitationPreview } from '@repo/server/organization/queries';
import {
  formatOrganizationRole,
  resolveMemberDisplayName,
} from '@repo/lib/utils/organization/members';

import {
  InvitationAcceptDialog,
  type InvitationAcceptView,
} from '@/components/organization/invitation-accept-dialog';

/**
 * Where an invitation link ends, once the invitee is signed in: a dialog to
 * accept it. The checks run in order, since each makes the next moot: a
 * wrong account can't accept whatever else is true, and someone who already
 * belongs has nothing to accept even from a link that still works.
 */
export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const [preview, user] = await Promise.all([
    token ? getOrganizationInvitationPreview(token) : null,
    getCurrentUser(),
  ]);

  let view: InvitationAcceptView;
  if (!token || !preview) {
    view = { kind: 'unavailable', organizationName: null };
  } else if (!preview.viewerEmailMatches) {
    view = {
      kind: 'wrong-account',
      invitationToken: token,
      inviteeEmail: preview.inviteeEmail,
      signedInEmail: user?.email ?? 'another account',
    };
  } else if (preview.viewerIsMember) {
    view = {
      kind: 'already-member',
      organizationId: preview.organizationId,
      organizationName: preview.organizationName,
    };
  } else if (preview.state !== 'pending') {
    view = { kind: 'unavailable', organizationName: preview.organizationName };
  } else {
    view = {
      kind: 'ready',
      invitationToken: token,
      organizationName: preview.organizationName,
      inviterName: resolveMemberDisplayName(preview.inviter),
      roleLabel: formatOrganizationRole(preview.inviteeRole),
    };
  }

  return <InvitationAcceptDialog view={view} />;
}
