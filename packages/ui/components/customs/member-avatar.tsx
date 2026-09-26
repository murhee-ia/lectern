import { cn } from 'cn';
import { getNameInitials } from '@repo/lib/utils/organization/members';

const AVATAR_SIZE_CLASSES = {
  sm: 'size-9 text-xs',
  lg: 'size-12 text-sm',
  xl: 'size-16 text-lg',
} as const;

/**
 * A member's photo, or their initials when there is none. Decorative only —
 * the name always sits beside it, so it is hidden from assistive technology.
 */
export function MemberAvatar({
  name,
  imageUrl,
  size = 'sm',
  className,
}: {
  name: string;
  imageUrl?: string | null;
  size?: keyof typeof AVATAR_SIZE_CLASSES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-lectern-white/15 bg-lectern-accent-purple/60 font-semibold text-foreground',
        AVATAR_SIZE_CLASSES[size],
        className,
      )}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="member-profile-avatar" className="size-full object-cover" />
      ) : (
        getNameInitials(name) || '?'
      )}
    </span>
  );
}
