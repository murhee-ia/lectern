import 'server-only';

import type { OrganizationRole } from '@repo/types/organization';
import { formatOrganizationRole } from '@repo/lib/utils/organization/members';

import { sendEmail } from '../notification/email';

// The names in an invitation are typed by people, so never trust them as HTML.
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * The link an invitation email carries. It opens the marketing site, which
 * works signed out: it sends the invitee to sign in or sign up as needed,
 * then on to the workspace to accept.
 */
export function organizationInvitationUrl(invitationToken: string): string {
  const url = new URL('/invitation', process.env.NEXT_PUBLIC_MARKETING_URL);
  url.searchParams.set('token', invitationToken);
  return url.toString();
}

/** Emails one invitation's link to the address it was sent to. */
export async function sendOrganizationInvitationEmail({
  to,
  invitationToken,
  organizationName,
  inviterName,
  role,
}: {
  to: string;
  invitationToken: string;
  organizationName: string;
  /** Who's sending it now: the first send's Admin, or whoever resends it. */
  inviterName: string;
  role: Exclude<OrganizationRole, 'admin'>;
}): Promise<void> {
  const link = organizationInvitationUrl(invitationToken);
  const roleLabel = formatOrganizationRole(role);
  const inviter = inviterName || 'An Admin';

  await sendEmail({
    to,
    subject: `${inviter} invited you to ${organizationName} on Lectern`,
    text: [
      `${inviter} invited you to join ${organizationName} on Lectern as a ${roleLabel}.`,
      '',
      `Accept the invitation: ${link}`,
      '',
      'The link stops working after 7 days. If you weren’t expecting this, you can ignore it.',
    ].join('\n'),
    html: `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 8px;font-size:14px;color:#71717a;">Lectern</p>
        <h1 style="margin:0 0 16px;font-size:20px;">You're invited to ${escapeHtml(organizationName)}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">
          ${escapeHtml(inviter)} invited you to join <strong>${escapeHtml(organizationName)}</strong> as a ${escapeHtml(roleLabel)}.
        </p>
        <a href="${escapeHtml(link)}" style="display:inline-block;background:#facc15;color:#18181b;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:999px;">Accept the invitation</a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#71717a;">
          The link stops working after 7 days. If you weren’t expecting this, you can ignore it.
        </p>
      </td></tr>
    </table>
  </body>
</html>`,
  });
}
