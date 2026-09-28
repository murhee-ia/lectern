import { NextResponse, type NextRequest } from 'next/server';

import { getOrganizationInvitationPreview } from '@repo/server/organization/queries';
import { createServerSupabaseClient } from '@repo/supabase/server';

import {
  importOAuthAvatarAction,
  resolveOrganizationMembershipAction,
} from '@/lib/actions/auth.actions';
import {
  GOOGLE_INVITATION_CALLBACK_PATH,
  GOOGLE_INVITATION_COOKIE,
} from '@/lib/constants/google-invitation.constants';
import { authPath } from '@/lib/utils/auth-path';

type StartedFlow = { state: string; token: string; joinCode: string | null };

/**
 * Where Google sends back someone signing in from an invitation. Lectern
 * swaps the code for the Google account's ID token and compares its address
 * with the invitation's. Only a match reaches Supabase, which then signs the
 * person in, or creates their account. Any other address goes back to the
 * form with nothing created. Its URLs are built on the marketing site's
 * configured address, as the start route's are.
 */
export async function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_MARKETING_URL!;
  const params = request.nextUrl.searchParams;

  const leaveTo = (url: URL) => {
    const response = NextResponse.redirect(url);
    response.cookies.delete({
      name: GOOGLE_INVITATION_COOKIE,
      path: GOOGLE_INVITATION_CALLBACK_PATH,
    });
    return response;
  };

  let flow: StartedFlow | null = null;
  try {
    flow = JSON.parse(
      request.cookies.get(GOOGLE_INVITATION_COOKIE)?.value ?? 'null',
    ) as StartedFlow | null;
  } catch {
    // An unreadable cookie is treated like a missing one below.
  }
  // Only a return from a sign-in this browser started here is trusted.
  if (!flow || params.get('state') !== flow.state) {
    return leaveTo(new URL('/signin?error=oauth_failed', origin));
  }
  const { token, joinCode } = flow;

  const preview = await getOrganizationInvitationPreview(token);
  if (!preview || preview.state !== 'pending') {
    const invitationUrl = new URL('/invitation', origin);
    invitationUrl.searchParams.set('token', token);
    return leaveTo(invitationUrl);
  }

  const acceptUrl = new URL(
    '/invitations/accept',
    process.env.NEXT_PUBLIC_WORKSPACE_URL,
  );
  acceptUrl.searchParams.set('token', token);

  const backToForm = (error?: string) => {
    const formUrl = new URL(
      authPath(preview.inviteeHasAccount ? '/signin' : '/signup', {
        next: acceptUrl.toString(),
        email: preview.inviteeEmail,
        invitation: token,
      }),
      origin,
    );
    if (error) formUrl.searchParams.set('error', error);
    return leaveTo(formUrl);
  };

  const code = params.get('code');
  // No code: they backed out at Google, which needs no message.
  if (!code) return backToForm();

  let tokens: { id_token?: string; access_token?: string } | null = null;
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
        redirect_uri: new URL(
          GOOGLE_INVITATION_CALLBACK_PATH,
          origin,
        ).toString(),
        grant_type: 'authorization_code',
      }),
      cache: 'no-store',
    });
    if (tokenResponse.ok) tokens = await tokenResponse.json();
  } catch {
    // Google unreachable: reported below like a refused code.
  }
  if (!tokens?.id_token) return backToForm('oauth_failed');

  // This came straight from Google over HTTPS, in exchange for Lectern's
  // client secret, so its claims can be read without checking the signature.
  // Supabase checks the signature itself before trusting the token.
  const [, payload = ''] = tokens.id_token.split('.');
  const claims = JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8'),
  ) as { email?: string; email_verified?: boolean };
  if (
    claims.email_verified !== true ||
    claims.email?.toLowerCase() !== preview.inviteeEmail
  ) {
    return backToForm('google_account_mismatch');
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: tokens.id_token,
    access_token: tokens.access_token,
  });
  if (error) return backToForm('oauth_failed');

  await importOAuthAvatarAction();
  // A new account gets its org-of-one here, as every sign-up does.
  await resolveOrganizationMembershipAction(joinCode);
  return leaveTo(acceptUrl);
}
