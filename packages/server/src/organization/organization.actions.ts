'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { SHARED_COOKIE_DOMAIN } from '@repo/supabase/cookies';
import { SELECTED_ORGANIZATION_COOKIE } from './organization.constants';
import { getCurrentUser } from '../auth/auth.queries';
import { getCurrentMemberships } from './organization.queries';

export async function selectOrganizationAction(
  organizationId: string,
): Promise<{ error?: string }> {
  if (!(await getCurrentUser())) {
    return { error: 'Not signed in.' };
  }

  const memberships = await getCurrentMemberships();
  if (!memberships.some((membership) => membership.id === organizationId)) {
    return { error: "You don't belong to that organization." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SELECTED_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    // Same domain as the auth cookies: workspace and org-console are separate
    // subdomains in production, and without this the selection written on one
    // is invisible to the other.
    domain: SHARED_COOKIE_DOMAIN,
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath('/', 'layout');
  return {};
}
