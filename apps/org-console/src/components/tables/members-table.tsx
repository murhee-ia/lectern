'use client';

import type { OrganizationMemberDetail } from '@repo/types/organization';
import {
  MEMBER_ROLE_FILTER_OPTIONS,
  useMemberDetailListTable,
} from '@repo/lib/hooks/use-member-list';
import { formatDateCompact } from '@repo/lib/utils/formatting/date';
import { MemberIdentity } from '@repo/ui/components/customs/member-identity';
import { ListTableFrame } from '@repo/ui/components/customs/list-table-frame';
import { ListTablePagination } from '@repo/ui/components/customs/list-table-pagination';
import {
  ListTableCount,
  ListTableNoMatches,
} from '@repo/ui/components/customs/list-table-summary';
import { ListTableToolbar } from '@repo/ui/components/customs/list-table-toolbar';
import { OrganizationRoleBadge } from '@repo/ui/components/customs/organization-role-badge';
import { ResponsiveTableLayout } from '@repo/ui/components/customs/responsive-table-layout';

import { useOrganizationModal } from '@/lib/stores/organization-modal.store';
import {
  describeTeamSessionRestrictions,
  formatMembershipJoinMethod,
} from '@/lib/utils/members/member-access';
import { OrganizationMemberActionsMenu } from '@/components/organization-member-actions-menu';

/**
 * The org console's view of everyone in the organization: search by name or
 * email, sort, filter by role, 20 to a page, and each member's actions.
 */
export function OrganizationMemberTable({
  members,
  avatarUrls,
}: {
  members: OrganizationMemberDetail[];
  /** Signed avatar URLs, keyed by avatar path. */
  avatarUrls: Map<string, string>;
}) {
  const list = useMemberDetailListTable(members);
  const openModal = useOrganizationModal((state) => state.onOpen);

  const imageUrlFor = (member: OrganizationMemberDetail) =>
    member.avatarPath ? avatarUrls.get(member.avatarPath) : null;

  return (
    <ListTableFrame>
      <ListTableToolbar
        search={list.search}
        searchLabel="Search members"
        searchPlaceholder="Search by name or email"
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
        highlightRowOnHover
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
            width: 'minmax(0,2.2fr)',
            placement: 'primary',
            // The name is the row's one real control. Its ::after stretches
            // across the whole row so the row reads as clickable, while the
            // actions menu sits above that layer and keeps working on its own.
            cell: (member) => (
              <button
                type="button"
                onClick={() =>
                  openModal('memberActivity', {
                    member,
                    memberImageUrl: imageUrlFor(member),
                  })
                }
                className="block w-full min-w-0 rounded-md text-left outline-none after:absolute after:inset-0 after:content-[''] focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <MemberIdentity
                  member={member}
                  imageUrl={imageUrlFor(member)}
                  showEmail
                />
                <span className="sr-only">, view team session activity</span>
              </button>
            ),
          },
          {
            id: 'role',
            header: 'Role',
            width: 'minmax(0,1.3fr)',
            placement: 'detail',
            cell: (member) => (
              <span className="flex flex-wrap items-center gap-1.5">
                <OrganizationRoleBadge role={member.role} />
                {describeTeamSessionRestrictions(member)
                  .filter(({ isRestricted }) => isRestricted)
                  .map(({ permission, restrictedLabel }) => (
                    <span
                      key={permission}
                      className="badge border-destructive/30 bg-destructive/10 text-destructive"
                    >
                      {restrictedLabel}
                    </span>
                  ))}
              </span>
            ),
          },
          {
            id: 'joined',
            header: 'Joined',
            width: 'minmax(0,1fr)',
            placement: 'detail',
            cell: (member) => (
              <>
                <span className="sr-only">Joined </span>
                {formatDateCompact(member.joinedAt)}
              </>
            ),
          },
          {
            id: 'joinMethod',
            header: 'How they joined',
            width: 'minmax(0,1.2fr)',
            placement: 'detail',
            cell: (member) => formatMembershipJoinMethod(member.joinMethod),
          },
          {
            id: 'actions',
            width: '2.25rem',
            placement: 'action',
            cell: (member) => <OrganizationMemberActionsMenu member={member} />,
          },
        ]}
      />

      <ListTablePagination pagination={list.pagination} label="Member pages" />
    </ListTableFrame>
  );
}
