'use server';

import { redirect } from 'next/navigation';

import { selectOrganizationAction } from '@repo/server/organization';
import { createServerSupabaseClient } from '@repo/supabase/server';

// accept_organization_invitation()'s own messages that are safe to show.
const DATABASE_MESSAGES: Record<string, string> = {
  'This invitation is no longer valid':
    'This invitation link no longer works. Ask the Admin to send it again.',
  'This invitation is for a different email address':
    'This invitation was sent to a different email address.',
  'You already belong to this organization':
    'You already belong to this organization.',
  'This organization has reached its member limit':
    'This organization has reached its member limit. Ask its Admin about it.',
};

/**
 * Joins the signed-in user to the invitation's organization, switches the
 * workspace to it, and opens it. The database checks everything: the link
 * still works, the sign-in email matches, and they don't already belong.
 */
export async function acceptInvitationAction(
  invitationToken: string,
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient();
  const { data: organizationId, error } = await supabase.rpc(
    'accept_organization_invitation',
    { invitation_token: invitationToken },
  );
  if (error || !organizationId) {
    return {
      error:
        (error?.message && DATABASE_MESSAGES[error.message]) ??
        'Something went wrong. Try again.',
    };
  }

  await selectOrganizationAction(organizationId);
  redirect('/');
}

/** Switches the workspace to an organization the user belongs to, and opens it. */
export async function openOrganizationAction(
  organizationId: string,
): Promise<{ error?: string }> {
  const result = await selectOrganizationAction(organizationId);
  if (result.error) return result;
  redirect('/');
}

/**
 * Signs out and reopens the invitation link signed out, which leads to
 * signing in, or up, as the invited address.
 */
export async function signOutToInvitationAction(
  invitationToken: string,
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  const invitationUrl = new URL(
    '/invitation',
    process.env.NEXT_PUBLIC_MARKETING_URL,
  );
  invitationUrl.searchParams.set('token', invitationToken);
  redirect(invitationUrl.toString());
}
