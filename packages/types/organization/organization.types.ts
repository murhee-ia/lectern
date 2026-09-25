import type { Database } from '@repo/supabase/types';
import type { MemberIdentity } from '../auth/auth.types';

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
  selectedOrganization: OrganizationMembership;
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
 * One membership tied to its member's identity — what every member of an
 * organization sees of the others in the workspace. No email.
 */
export type OrganizationMember = MemberIdentity & {
  role: OrganizationRole;
  joinedAt: string;
};

/**
 * A member as the org console's members list shows them to an Admin:
 * everything {@link OrganizationMember} holds, plus how they joined, what
 * they're restricted from, and their email — which that list is the only
 * place in the console to show.
 */
export type OrganizationMemberDetail = OrganizationMember & {
  /**
   * Permissions this member's role normally grants, withheld from them
   * individually by the Admin. Mirrors their rows in
   * `membership_permission_restrictions`.
   */
  restrictedPermissions: AppPermission[];
  joinMethod: MembershipJoinMethod;
  email: string;
};

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

/**
 * Mirrors `organization_invites.status`. An invitation is `pending` until it's
 * accepted or canceled, and pending again whenever it's resent. "Expired"
 * isn't a status; it comes from `expires_at`. The column is still
 * unconstrained text, and gets a check constraint when the invitation flow is
 * built.
 */
export type OrganizationInvitationStatus = 'pending' | 'accepted' | 'canceled';

/**
 * An invitation as the invitations page lists it: an `organization_invites`
 * row minus `token`, the credential the emailed link carries, which nothing
 * in the UI needs. Never `accepted`: an accepted invitation is a membership,
 * and appears on the members list instead.
 */
export type OrganizationInvitation = {
  id: string;
  email: string;
  /** Encodes the table's `check (role <> 'admin')` — an invite never grants Admin. */
  role: Exclude<OrganizationRole, 'admin'>;
  status: Exclude<OrganizationInvitationStatus, 'accepted'>;
  createdAt: string;
  expiresAt: string;
};
