'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { SHARED_COOKIE_DOMAIN } from '@repo/supabase/cookies';
import { createServerSupabaseClient } from '@repo/supabase/server';
import type { WorkspaceOrganizationMembership } from '@repo/types/organization';

const SELECTED_ORGANIZATION_COOKIE = 'lectern_selected_organization_id';

export async function getWorkspaceOrganizationsAction(): Promise<{
  organizations: WorkspaceOrganizationMembership[];
  selectedOrganizationId: string;
}> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not signed in.');
  }

  const { data: memberships, error } = await supabase
    .from('memberships')
    .select('organization_id, role, organizations(name, plan)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load organizations: ${error.message}`);
  }
  if (!memberships || memberships.length === 0) {
    throw new Error('No organization found for this account.');
  }

  const organizations: WorkspaceOrganizationMembership[] = memberships.map(
    (membership) => ({
      id: membership.organization_id,
      name: membership.organizations?.name ?? 'Untitled organization',
      plan: membership.organizations?.plan,
      role: membership.role,
    }),
  );

  // Earliest membership is always the org-of-one
  const defaultOrganizationId = organizations[0]!.id;

  const cookieStore = await cookies();
  const cookieOrganizationId = cookieStore.get(
    SELECTED_ORGANIZATION_COOKIE,
  )?.value;
  const selectedOrganizationId =
    cookieOrganizationId &&
    organizations.some(
      (organization) => organization.id === cookieOrganizationId,
    )
      ? cookieOrganizationId
      : defaultOrganizationId;

  return { organizations, selectedOrganizationId };
}

export async function selectOrganizationAction(
  organizationId: string,
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not signed in.' };
  }

  const { data: membership, error } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  if (!membership) {
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
