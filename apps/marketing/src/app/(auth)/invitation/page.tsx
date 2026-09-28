import { redirect } from 'next/navigation';

import { getCurrentUser } from '@repo/server/auth/queries';
import { getOrganizationInvitationPreview } from '@repo/server/organization/queries';

import { InvitationNotice } from '@/components/auth/invitation-notice';
import { authPath } from '@/lib/utils/auth-path';

/**
 * Where an invitation email's link lands. It works signed out, which the
 * workspace can't: it sends the invitee to sign in, or to sign up when the
 * invited address has no account yet, with that email filled in, and from
 * there on to the workspace to accept. Someone already signed in goes straight
 * to the workspace, which handles every case, a wrong account included.
 */
export default async function InvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const preview = token ? await getOrganizationInvitationPreview(token) : null;

  if (!token || !preview) {
    return (
      <InvitationNotice
        title="This invitation link isn't valid"
        message="Check that you opened the whole link from the email, or ask whoever invited you to send it again."
      />
    );
  }

  const acceptUrl = new URL(
    '/invitations/accept',
    process.env.NEXT_PUBLIC_WORKSPACE_URL,
  );
  acceptUrl.searchParams.set('token', token);

  if (await getCurrentUser()) redirect(acceptUrl.toString());

  if (preview.state !== 'pending') {
    return (
      <InvitationNotice
        title="This invitation link no longer works"
        message={`It expired, was canceled, or was already used. Ask ${preview.organizationName}'s Admin to send it again.`}
      />
    );
  }

  redirect(
    authPath(preview.inviteeHasAccount ? '/signin' : '/signup', {
      next: acceptUrl.toString(),
      email: preview.inviteeEmail,
      invitation: token,
    }),
  );
}
