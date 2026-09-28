import type {
  AppPermission,
  MembershipJoinMethod,
  OrganizationMemberDetail,
  OrganizationRole,
} from '@repo/types/organization';

const JOIN_METHOD_LABELS: Record<MembershipJoinMethod, string> = {
  organization_creation: 'Created the organization',
  join_code: 'Organization code',
  email_invitation: 'Email invitation',
};

export function formatMembershipJoinMethod(
  joinMethod: MembershipJoinMethod,
): string {
  return JOIN_METHOD_LABELS[joinMethod];
}

/**
 * Whether a role can start team sessions — mirrors which roles are seeded
 * with `sessions.team.start` in role_permissions (Admin and Session leader).
 */
export function canRoleStartTeamSessions(role: OrganizationRole): boolean {
  return role !== 'member';
}

type TeamSessionPermission = Extract<
  AppPermission,
  'sessions.team.join' | 'sessions.team.start'
>;

/**
 * The team-session permissions an Admin can withhold from each role: joining,
 * from a Member; starting and joining, from a Session leader. The Admin's own
 * membership can't be restricted. Mirrors the INSERT policy on
 * membership_permission_restrictions, which is what actually enforces it.
 */
const RESTRICTABLE_TEAM_SESSION_PERMISSIONS: Record<
  OrganizationRole,
  readonly TeamSessionPermission[]
> = {
  admin: [],
  session_leader: ['sessions.team.start', 'sessions.team.join'],
  member: ['sessions.team.join'],
};

const RESTRICTION_COPY = {
  'sessions.team.join': {
    restrictAction: 'Restrict joining team sessions',
    allowAction: 'Allow joining team sessions',
    // Starting always lets someone into their own session — see
    // can_join_team_session() — so only other people's are off limits.
    restrictedLabel: "Can't join others' team sessions",
  },
  'sessions.team.start': {
    restrictAction: 'Restrict starting team sessions',
    allowAction: 'Allow starting team sessions',
    restrictedLabel: "Can't start team sessions",
  },
} as const;

/**
 * Every restriction a member's role allows, whether each is in force, and the
 * copy for toggling it. Empty for the Admin.
 */
export function describeTeamSessionRestrictions(
  member: Pick<OrganizationMemberDetail, 'role' | 'restrictedPermissions'>,
) {
  return RESTRICTABLE_TEAM_SESSION_PERMISSIONS[member.role].map(
    (permission) => {
      const isRestricted = member.restrictedPermissions.includes(permission);
      const copy = RESTRICTION_COPY[permission];

      return {
        permission,
        isRestricted,
        toggleLabel: isRestricted ? copy.allowAction : copy.restrictAction,
        restrictedLabel: copy.restrictedLabel,
      };
    },
  );
}
