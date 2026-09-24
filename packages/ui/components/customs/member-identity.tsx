import type { OrganizationMember } from '@repo/types/organization';
import { resolveMemberDisplayName } from '@repo/lib/utils/organization';
import { MemberAvatar } from '@repo/ui/components/customs/member-avatar';

/**
 * Avatar, name, and optionally email. The one way a member is identified on
 * every screen, so a person's name never resolves differently between apps.
 */
export function MemberIdentity({
  member,
  imageUrl,
  showEmail = false,
  size = 'sm',
}: {
  member: Pick<
    OrganizationMember,
    'displayName' | 'firstName' | 'lastName' | 'email'
  >;
  imageUrl?: string | null;
  showEmail?: boolean;
  size?: 'sm' | 'lg';
}) {
  const name = resolveMemberDisplayName(member);
  const email = showEmail && name !== member.email ? member.email : null;

  return (
    <span className="flex min-w-0 items-center gap-3">
      <MemberAvatar name={name} imageUrl={imageUrl} size={size} />
      <span className="flex min-w-0 flex-col text-left">
        <span className="truncate font-medium text-foreground">{name}</span>
        {email && (
          <span className="truncate text-xs text-foreground/60">{email}</span>
        )}
      </span>
    </span>
  );
}
