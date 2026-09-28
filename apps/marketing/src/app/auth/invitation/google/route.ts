import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

import { getOrganizationInvitationPreview } from '@repo/server/organization/queries';

import {
  GOOGLE_INVITATION_CALLBACK_PATH,
  GOOGLE_INVITATION_COOKIE,
} from '@/lib/constants/google-invitation.constants';

/**
 * Starts Google sign-in for someone opening an invitation. The usual Google
 * button goes through Supabase, which creates the account the moment Google
 * answers, before Lectern could see which address came back. Here Lectern
 * talks to Google itself, and the callback hands the account to Supabase only
 * once its address is the invited one.
 *
 * Every URL here is built on the marketing site's one configured address,
 * not the request's: Google returns only to the address registered with it,
 * and this flow's cookie has to be waiting there.
 */
export async function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_MARKETING_URL!;
  const token = request.nextUrl.searchParams.get('token');
  const joinCode = request.nextUrl.searchParams.get('join_code');
  const preview = token ? await getOrganizationInvitationPreview(token) : null;

  // The invitation page explains an unknown or dead link.
  if (!token || !preview || preview.state !== 'pending') {
    const invitationUrl = new URL('/invitation', origin);
    if (token) invitationUrl.searchParams.set('token', token);
    return NextResponse.redirect(invitationUrl);
  }

  const state = randomBytes(32).toString('hex');
  const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleUrl.search = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: new URL(GOOGLE_INVITATION_CALLBACK_PATH, origin).toString(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    // Only a suggestion: the callback still checks the address that comes back.
    login_hint: preview.inviteeEmail,
    prompt: 'select_account',
  }).toString();

  const response = NextResponse.redirect(googleUrl);
  response.cookies.set(
    GOOGLE_INVITATION_COOKIE,
    JSON.stringify({ state, token, joinCode }),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: origin.startsWith('https:'),
      path: GOOGLE_INVITATION_CALLBACK_PATH,
      maxAge: 60 * 10,
    },
  );
  return response;
}
