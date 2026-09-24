import type { Database } from '@repo/supabase/types';
import type { MemberProfile } from '../auth/auth.types';

// ---------------------------------------------------------------------------
// Mirrors of database enums. Derived from the generated types rather than
// restated, so a migration that changes an enum breaks the build here instead
// of drifting silently.
// ---------------------------------------------------------------------------

/** The `organization_role` enum — the role a membership holds. */
export type OrganizationRole = Database['public']['Enums']['organization_role'];

/** The `app_permission` enum — what `has_permission()` checks against. */
export type AppPermission = Database['public']['Enums']['app_permission'];

/** The `membership_join_method` enum — how a membership came to exist. */
export type MembershipJoinMethod =
  Database['public']['Enums']['membership_join_method'];

// ---------------------------------------------------------------------------
// Organizations and memberships
// ---------------------------------------------------------------------------

/** The identifying fields of an organization. */
export type OrganizationSummary = {
  id: string;
  name: string;
  plan: string;
};

/** An organization the signed-in user belongs to, and their role in it. */
export type OrganizationMembership = OrganizationSummary & {
  role: OrganizationRole;
};

/**
 * The organizations the signed-in user belongs to, and which one is selected.
 * Every account has at least one — its own org-of-one — so `selected` is
 * never missing.
 */
export type OrganizationSelection = {
  organizations: OrganizationMembership[];
  selected: OrganizationMembership;
};

/**
 * What the signed-in user can do in one organization: their role, and every
 * permission `has_permission()` grants them there.
 */
export type OrganizationAccess = {
  organization: OrganizationSummary;
  role: OrganizationRole;
  permissions: AppPermission[];
};

/** The organization fields the console's invitations and settings pages show. */
export type OrganizationSettings = {
  id: string;
  name: string;
  joinCode: string;
};

/**
 * One membership joined to its member_profiles row. This is the read-only view
 * any member of an organization is allowed to see of the others.
 */
export type OrganizationMember = Omit<MemberProfile, 'createdAt'> & {
  role: OrganizationRole;
  joinedAt: string;
};

/**
 * A member as an organization's Admin sees them: everything
 * {@link OrganizationMember} holds, plus what they're restricted from.
 */
export type OrganizationMemberDetail = OrganizationMember & {
  /**
   * Permissions this member's role normally grants, withheld from them
   * individually by the Admin. Mirrors their rows in
   * `membership_permission_restrictions`.
   */
  restrictedPermissions: AppPermission[];
  joinMethod: MembershipJoinMethod;
};

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

/**
 * Mirrors `organization_invites.status`. The column is unconstrained text and
 * only 'pending' is ever written today; these are the values the invitations
 * flow needs it to hold, and worth a check constraint once it is built.
 */
export type OrganizationInvitationStatus = 'pending' | 'accepted' | 'revoked';

/**
 * Mirrors an `organization_invites` row, minus `token`: that is the credential
 * the emailed link carries, and nothing in the UI needs it.
 */
export type OrganizationInvitation = {
  id: string;
  email: string;
  /** Encodes the table's `check (role <> 'admin')` — an invite never grants Admin. */
  role: Exclude<OrganizationRole, 'admin'>;
  status: OrganizationInvitationStatus;
  createdAt: string;
  expiresAt: string;
};
