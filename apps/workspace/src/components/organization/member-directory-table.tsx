'use client';

import type { OrganizationMember } from '@repo/types/organization';
import {
  MEMBER_ROLE_FILTER_OPTIONS,
  useMemberListTable,
} from '@repo/lib/hooks/use-member-list';
import { formatDateComplete } from '@repo/lib/utils/formatting/date';
import { ListTableFrame } from '@repo/ui/components/customs/list-table-frame';
import { ListTablePagination } from '@repo/ui/components/customs/list-table-pagination';
import {
  ListTableCount,
  ListTableNoMatches,
} from '@repo/ui/components/customs/list-table-summary';
import { ListTableToolbar } from '@repo/ui/components/customs/list-table-toolbar';
import { MemberIdentity } from '@repo/ui/components/customs/member-identity';
import { OrganizationRoleBadge } from '@repo/ui/components/customs/organization-role-badge';
import { ResponsiveTableLayout } from '@repo/ui/components/customs/responsive-table-layout';

/**
 * Who's in the organization — read-only, and the same for every member
 * whatever their role, with the console's search, sort, filter, and pages.
 * Search is by name only: the workspace never loads anyone's email.
 */
export function OrganizationMemberDirectoryTable({
  members,
  avatarUrls,
}: {
  members: OrganizationMember[];
  avatarUrls: Map<string, string>;
}) {
  const list = useMemberListTable(members);

  return (
    <ListTableFrame>
      <ListTableToolbar
        search={list.search}
        searchLabel="Search members"
        searchPlaceholder="Search by name"
        sort={list.sort}
        filter={{
          filterLabel: 'Role',
          allLabel: 'All roles',
          pluralLabel: 'roles',
          options: MEMBER_ROLE_FILTER_OPTIONS,
          selected: list.getFilterValues('role'),
          onChange: (roles) => list.setFilterValues('role', roles),
        }}
      />

      <ListTableCount
        totalCount={list.totalCount}
        matchingCount={list.matchingCount}
        isNarrowed={list.isNarrowed}
        singular="member"
        plural="members"
      />

      <ResponsiveTableLayout
        rows={list.rows}
        getRowKey={(member) => member.userId}
        scrollResetKey={list.pagination.pageNumber}
        empty={
          <ListTableNoMatches
            message="No members match your search."
            onClear={list.clearSearchAndFilters}
          />
        }
        columns={[
          {
            id: 'member',
            header: 'Member',
            width: 'minmax(0,2fr)',
            placement: 'primary',
            cell: (member) => (
              <MemberIdentity
                member={member}
                imageUrl={
                  member.avatarPath ? avatarUrls.get(member.avatarPath) : null
                }
              />
            ),
          },
          {
            id: 'role',
            header: 'Role',
            width: 'minmax(0,1fr)',
            placement: 'detail',
            cell: (member) => <OrganizationRoleBadge role={member.role} />,
          },
          {
            id: 'joined',
            header: 'Joined',
            width: 'minmax(0,1fr)',
            placement: 'detail',
            cell: (member) => (
              <>
                <span className="sr-only">Joined </span>
                {formatDateComplete(member.joinedAt)}
              </>
            ),
          },
        ]}
      />

      <ListTablePagination pagination={list.pagination} label="Member pages" />
    </ListTableFrame>
  );
}
