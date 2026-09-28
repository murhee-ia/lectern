'use client';

import { Ellipsis } from 'lucide-react';

import type { OrganizationMemberDetail } from '@repo/types/organization';
import { useOrganizationAccess } from '@repo/lib/hooks/use-organization-access';
import { useKeyboardOnlyFocusReturn } from '@repo/lib/hooks/use-keyboard-only-focus-return';
import { resolveMemberDisplayName } from '@repo/lib/utils/organization/members';
import { Button } from '@repo/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu';

import { describeTeamSessionRestrictions } from '@/lib/utils/members/member-access';

/**
 * What an Admin can do to one member. None of these act yet — choosing one
 * just closes the menu. Each is already gated on the permission its eventual
 * RPC will check, so the menu offers exactly what the signed-in user will be
 * allowed to do once it's wired.
 */
export function OrganizationMemberActionsMenu({
  member,
}: {
  member: OrganizationMemberDetail;
}) {
  const { hasPermission } = useOrganizationAccess();
  const returnFocusAfterKeyboardOnly = useKeyboardOnlyFocusReturn();

  // The Admin's own membership can't be changed, restricted, or removed —
  // the role only ever moves through a handoff.
  if (member.role === 'admin') return null;

  const restrictions = describeTeamSessionRestrictions(member);

  const canChangeRole = hasPermission('members.role.change');
  const canRestrict = hasPermission('members.restrict');
  const canRemove = hasPermission('members.remove');
  const canManageAccess = canChangeRole || canRestrict;
  if (!canManageAccess && !canRemove) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${resolveMemberDisplayName(member)}`}
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64"
        onCloseAutoFocus={returnFocusAfterKeyboardOnly}
      >
        {canChangeRole && <DropdownMenuItem>Change role</DropdownMenuItem>}
        {canRestrict &&
          restrictions.map(({ permission, toggleLabel }) => (
            <DropdownMenuItem key={permission}>{toggleLabel}</DropdownMenuItem>
          ))}
        {canManageAccess && canRemove && <DropdownMenuSeparator />}
        {canRemove && (
          <DropdownMenuItem variant="destructive">
            Remove from organization
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
