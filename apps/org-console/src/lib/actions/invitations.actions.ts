'use server';

import { revalidatePath } from 'next/cache';

import { invitationSchema } from '@repo/lib/schemas/organization';
import { resolveMemberDisplayName } from '@repo/lib/utils/organization/members';
import { getCurrentMemberProfile } from '@repo/server/auth/profile/queries';
import { sendOrganizationInvitationEmail } from '@repo/server/organization/invitation-email';
import { getOrganizationAccess } from '@repo/server/organization/queries';
import { createServerSupabaseClient } from '@repo/supabase/server';

import { organizationPath } from '@/lib/utils/organization-routes';

type InvitationActionResult = { error?: string };

const NOT_AUTHORIZED = "You can't manage this organization's invitations.";

// The invitation functions' own messages that are safe, and useful, to show.
const DATABASE_MESSAGES: Record<string, string> = {
  'Not authorized': NOT_AUTHORIZED,
  'Enter a valid email address': 'Enter a valid email address.',
  'This organization has reached its member limit':
    'This organization has reached its member limit for its plan.',
};

function toMessage(databaseMessage: string | undefined): string {
  return (
    (databaseMessage && DATABASE_MESSAGES[databaseMessage]) ??
    'Something went wrong. Try again.'
  );
}

// Who's sending, for the email: the organization's name and the signed-in
// Admin's name. Null when they can't manage invitations here.
async function getSender(organizationId: string) {
  const [access, profile] = await Promise.all([
    getOrganizationAccess(organizationId),
    getCurrentMemberProfile(),
  ]);
  if (!access?.permissions.includes('invites.manage')) return null;
  return {
    organizationName: access.organization.name,
    inviterName: profile ? resolveMemberDisplayName(profile) : '',
  };
}

/**
 * Invites an address, or refreshes its open invitation, and emails the link.
 * Never says whether the address already belongs to a member.
 */
export async function sendInvitationAction(
  organizationId: string,
  input: { email: string; role: string },
): Promise<InvitationActionResult> {
  const parsed = invitationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Check the email and role.',
    };
  }

  const sender = await getSender(organizationId);
  if (!sender) return { error: NOT_AUTHORIZED };

  const supabase = await createServerSupabaseClient();
  const { data: invitationToken, error } = await supabase.rpc(
    'send_organization_invitation',
    {
      target_organization_id: organizationId,
      invitee_email: parsed.data.email,
      invitee_role: parsed.data.role,
    },
  );
  if (error || !invitationToken) return { error: toMessage(error?.message) };

  // The invitation is saved whether or not the email goes out.
  revalidatePath(organizationPath(organizationId, 'invitations'));

  try {
    await sendOrganizationInvitationEmail({
      to: parsed.data.email,
      invitationToken,
      organizationName: sender.organizationName,
      inviterName: sender.inviterName,
      role: parsed.data.role,
    });
  } catch {
    return {
      error:
        "The invitation is saved, but its email couldn't be sent. Send it again to retry.",
    };
  }
  return {};
}

/**
 * Resends every given invitation that can be — expired or canceled — with a
 * new link, and emails each. Others are skipped, so a whole selection can be
 * passed.
 */
export async function resendInvitationsAction(
  organizationId: string,
  invitationIds: string[],
): Promise<InvitationActionResult> {
  if (invitationIds.length === 0) return {};

  const sender = await getSender(organizationId);
  if (!sender) return { error: NOT_AUTHORIZED };

  const supabase = await createServerSupabaseClient();
  const { data: resent, error } = await supabase.rpc(
    'resend_organization_invitations',
    { target_organization_id: organizationId, invitation_ids: invitationIds },
  );
  if (error) return { error: toMessage(error.message) };

  revalidatePath(organizationPath(organizationId, 'invitations'));

  const deliveries = await Promise.allSettled(
    resent.flatMap((invitation) =>
      // Only narrows the type: the table rules out an 'admin' invitation.
      invitation.invitee_role === 'admin'
        ? []
        : [
            sendOrganizationInvitationEmail({
              to: invitation.invitee_email,
              invitationToken: invitation.invitation_token,
              organizationName: sender.organizationName,
              inviterName: sender.inviterName,
              role: invitation.invitee_role,
            }),
          ],
    ),
  );
  const failedCount = deliveries.filter(
    (delivery) => delivery.status === 'rejected',
  ).length;
  if (failedCount > 0) {
    return {
      error: `${failedCount} of ${deliveries.length} invitation emails couldn't be sent. Send them again to retry.`,
    };
  }
  return {};
}

/**
 * Cancels every given invitation whose link still works; the links already
 * sent stop working at once. Others are skipped.
 */
export async function cancelInvitationsAction(
  organizationId: string,
  invitationIds: string[],
): Promise<InvitationActionResult> {
  if (invitationIds.length === 0) return {};

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc('cancel_organization_invitations', {
    target_organization_id: organizationId,
    invitation_ids: invitationIds,
  });
  if (error) return { error: toMessage(error.message) };

  revalidatePath(organizationPath(organizationId, 'invitations'));
  return {};
}
