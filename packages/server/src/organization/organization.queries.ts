import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '../auth/auth.queries';
import { createServerSupabaseClient } from '@repo/supabase/server';
import type {
  AppPermission,
  OrganizationAccess,
  OrganizationInvitation,
  OrganizationMember,
  OrganizationMemberDetail,
  OrganizationMembership,
  OrganizationSelection,
  OrganizationSettings,
} from '@repo/types/organization';
import {
  MEMBER_IDENTITY_COLUMNS,
  toMemberIdentity,
} from '../auth/profile.queries';
import { SELECTED_ORGANIZATION_COOKIE } from './organization.constants';

/** Every organization the signed-in user belongs to, oldest membership first. */
export const getCurrentMemberships = cache(
  async (): Promise<OrganizationMembership[]> => {
    const user = await getCurrentUser();
    if (!user) return [];

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('memberships')
      .select('organization_id, role, organizations(name, plan)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to load organizations: ${error.message}`);
    }
    return data.flatMap((membership) =>
      membership.organizations
        ? [
            {
              id: membership.organization_id,
              name: membership.organizations.name,
              plan: membership.organizations.plan,
              role: membership.role,
            },
          ]
        : [],
    );
  },
);

/**
 * Which organization the workspace is scoped to: the one saved in the
 * selection cookie while the user still belongs to it, otherwise their oldest
 * membership — the org-of-one every account starts with.
 */
export const getOrganizationSelection = cache(
  async (): Promise<OrganizationSelection> => {
    const organizations = await getCurrentMemberships();
    const [oldestMembership] = organizations;
    if (!oldestMembership) {
      throw new Error('No organization found for this account.');
    }

    const cookieStore = await cookies();
    const savedSelectedOrganizationId = cookieStore.get(
      SELECTED_ORGANIZATION_COOKIE,
    )?.value;

    return {
      organizations,
      selected:
        organizations.find(
          (organization) => organization.id === savedSelectedOrganizationId,
        ) ?? oldestMembership,
    };
  },
);

/**
 * Everyone in an organization, each with their identity, oldest first. What
 * the workspace shows, so no email. RLS returns rows only when the signed-in
 * user is a member of that organization.
 *
 * One request: memberships.user_id has a foreign key to member_profiles as
 * well as to auth.users, and that one is what lets PostgREST embed the
 * profile in the same query.
 */
export const getOrganizationMembers = cache(
  async (organizationId: string): Promise<OrganizationMember[]> => {
    const supabase = await createServerSupabaseClient();
    const { data: memberships, error } = await supabase
      .from('memberships')
      .select(
        ` member_profiles(${MEMBER_IDENTITY_COLUMNS}), role, created_at` as const,
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to load members: ${error.message}`);
    }

    // The foreign key guarantees every membership has a profile, so a missing
    // one means RLS hid it — skip the row rather than render a blank member.
    return memberships.flatMap(({ member_profiles, role, created_at }) =>
      member_profiles
        ? [{ ...toMemberIdentity(member_profiles), role, joinedAt: created_at }]
        : [],
    );
  },
);

/**
 * Everyone in an organization as the org console's members list shows them:
 * their identity, email, how they joined, and the permissions withheld from
 * each. The one query that selects another member's email. RLS shows
 * restrictions only to a holder of `members.restrict` (and each member their
 * own restrictions). For Admin-only pages.
 */
export const getOrganizationMemberDetails = cache(
  async (organizationId: string): Promise<OrganizationMemberDetail[]> => {
    const supabase = await createServerSupabaseClient();
    const { data: memberships, error } = await supabase
      .from('memberships')
      .select(
        `member_profiles(${MEMBER_IDENTITY_COLUMNS}, email), role, created_at, join_method, membership_permission_restrictions(permission)` as const,
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to load members: ${error.message}`);
    }

    return memberships.flatMap(
      ({
        member_profiles,
        role,
        created_at,
        join_method,
        membership_permission_restrictions: restrictions,
      }) =>
        member_profiles
          ? [
              {
                ...toMemberIdentity(member_profiles),
                email: member_profiles.email,
                role,
                joinedAt: created_at,
                joinMethod: join_method,
                restrictedPermissions: restrictions.map(
                  ({ permission }) => permission,
                ),
              },
            ]
          : [],
    );
  },
);

/**
 * The signed-in user's role and permissions in one organization, or null if
 * they aren't a member. Permissions come from current_organization_permissions(),
 * which asks has_permission() itself — so what the UI offers can't disagree
 * with what row-level security will allow.
 */
export const getOrganizationAccess = cache(
  async (organizationId: string): Promise<OrganizationAccess | null> => {
    const membership = (await getCurrentMemberships()).find(
      (candidate) => candidate.id === organizationId,
    );
    if (!membership) return null;

    const supabase = await createServerSupabaseClient();
    const { data: permissions, error } = await supabase.rpc(
      'current_organization_permissions',
      { check_organization_id: organizationId },
    );
    if (error) {
      throw new Error(`Failed to load permissions: ${error.message}`);
    }

    const { role, ...organization } = membership;
    return { organization, role, permissions };
  },
);

/**
 * Whether the signed-in user holds a permission in an organization. For a
 * Server Action to check before it acts, or a Server Component before it
 * renders a control. False for a non-member.
 */
export async function hasOrganizationPermission(
  organizationId: string,
  permission: AppPermission,
): Promise<boolean> {
  const access = await getOrganizationAccess(organizationId);
  return access?.permissions.includes(permission) ?? false;
}

/**
 * The organization, if the signed-in user holds the permission there. For a
 * page that exists only to use one permission. Anyone else gets a 404, like
 * {@link requireOrganizationAdmin}.
 */
export async function requireOrganizationPermission(
  organizationId: string,
  permission: AppPermission,
): Promise<OrganizationAccess> {
  const access = await getOrganizationAccess(organizationId);
  if (!access?.permissions.includes(permission)) notFound();
  return access;
}

/**
 * The organization, if the signed-in user is its Admin. Everyone else — a
 * Member, a Session leader, a non-member — gets the same 404, so probing a URL
 * can't reveal whether an organization exists.
 */
export async function requireOrganizationAdmin(
  organizationId: string,
): Promise<OrganizationAccess> {
  const access = await getOrganizationAccess(organizationId);
  if (!access || access.role !== 'admin') notFound();
  return access;
}

/**
 * Every invitation the invitations page lists, newest first: pending and
 * canceled ones however old, since the page doubles as the organization's
 * invitation log. Accepted ones are memberships now, and appear on the
 * members list instead. RLS returns rows only to a holder of `invites.manage`.
 */
export const getOrganizationInvitations = cache(
  async (organizationId: string): Promise<OrganizationInvitation[]> => {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('organization_invites')
      .select('id, email, role, status, created_at, expires_at')
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'canceled'])
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load invitations: ${error.message}`);
    }

    // Both checks only narrow to the type: the table already rules out an
    // 'admin' invitation, and the query already filtered the status.
    return data.flatMap(({ role, status, ...invitation }) =>
      role !== 'admin' && (status === 'pending' || status === 'canceled')
        ? [
            {
              id: invitation.id,
              email: invitation.email,
              role,
              status,
              createdAt: invitation.created_at,
              expiresAt: invitation.expires_at,
            },
          ]
        : [],
    );
  },
);

/**
 * An organization's name and join code, or null if the signed-in user isn't a
 * member.
 */
export const getOrganizationSettings = cache(
  async (organizationId: string): Promise<OrganizationSettings | null> => {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, join_code')
      .eq('id', organizationId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load organization: ${error.message}`);
    }
    return data
      ? { 
        id: data.id, 
        name: data.name, 
        joinCode: data.join_code 
      } : null;
  },
);
