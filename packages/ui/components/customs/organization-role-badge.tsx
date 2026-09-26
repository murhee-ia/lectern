import { cn } from 'cn';
import type { OrganizationRole } from '@repo/types/organization';
import { formatOrganizationRole } from '@repo/lib/utils/organization/members';

const ROLE_BADGE_CLASSES: Record<OrganizationRole, string> = {
  admin: 'badge-highlight',
  session_leader: 'badge-accent',
  member: '',
};

export function OrganizationRoleBadge({ role }: { role: OrganizationRole }) {
  return (
    <span className={cn('badge', ROLE_BADGE_CLASSES[role])}>
      {formatOrganizationRole(role)}
    </span>
  );
}
