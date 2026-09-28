'use client';

import type {
  OrganizationMember,
  OrganizationMemberDetail,
} from '@repo/types/organization';

import {
  compareOrganizationRoles,
  formatOrganizationRole,
  ORGANIZATION_ROLES,
  resolveMemberDisplayName,
} from '../../utils/organization/organization-member';
import {
  createListTableColumnHelper,
  createOneOfFilterFn,
  SEARCH_COLUMN_ID,
  useListTable,
  type ListTableFilterOption,
  type ListTableSortOption,
} from '../shared/use-list-table';

/** The member lists' sort choices: role order by default, as the console shows it. */
const MEMBER_SORT_OPTIONS: [ListTableSortOption, ...ListTableSortOption[]] = [
  {
    id: 'role',
    label: 'Role',
    sorting: [
      { id: 'role', desc: false },
      { id: 'name', desc: false },
    ],
  },
  {
    id: 'name-ascending',
    label: 'Name, A to Z',
    sorting: [{ id: 'name', desc: false }],
  },
  {
    id: 'name-descending',
    label: 'Name, Z to A',
    sorting: [{ id: 'name', desc: true }],
  },
  {
    id: 'newest',
    label: 'Newest members first',
    sorting: [{ id: 'joinedAt', desc: true }],
  },
  {
    id: 'oldest',
    label: 'Oldest members first',
    sorting: [{ id: 'joinedAt', desc: false }],
  },
];

/** The role filter's choices, most to least privileged. */
export const MEMBER_ROLE_FILTER_OPTIONS: ListTableFilterOption[] =
  ORGANIZATION_ROLES.map((role) => ({
    value: role,
    label: formatOrganizationRole(role),
  }));

// The display name and the first and last name, so searching someone's real
// name still finds them when their display name is a nickname.
function memberSearchText(member: OrganizationMember): string {
  return [member.displayName, member.firstName, member.lastName]
    .filter(Boolean)
    .join(' ');
}

function createMemberListColumns<Member extends OrganizationMember>(
  getSearchText: (member: Member) => string,
) {
  const columnHelper = createListTableColumnHelper<Member>();
  return columnHelper.columns([
    columnHelper.accessor(getSearchText, {
      id: SEARCH_COLUMN_ID,
      enableSorting: false,
    }),
    columnHelper.accessor((member) => resolveMemberDisplayName(member), {
      id: 'name',
      sortFn: 'text',
    }),
    columnHelper.accessor((member) => member.role, {
      id: 'role',
      filterFn: createOneOfFilterFn<Member>(),
      sortFn: (rowA, rowB) =>
        compareOrganizationRoles(rowA.original.role, rowB.original.role),
    }),
    columnHelper.accessor((member) => member.joinedAt, {
      id: 'joinedAt',
      sortFn: 'basic',
    }),
  ]);
}

// Defined once, here, so they keep their identity between renders.
const memberColumns =
  createMemberListColumns<OrganizationMember>(memberSearchText);
const memberDetailColumns = createMemberListColumns<OrganizationMemberDetail>(
  (member) => `${memberSearchText(member)} ${member.email}`,
);

/**
 * The workspace's member directory: search by name, sort, filter by role,
 * pages of 20. Never by email — the workspace doesn't load it.
 */
export function useMemberListTable(members: OrganizationMember[]) {
  return useListTable({
    data: members,
    columns: memberColumns,
    getRowId: (member) => member.userId,
    sortOptions: MEMBER_SORT_OPTIONS,
  });
}

/**
 * The org console's member list: the same as the directory, with email
 * searchable too — the one list allowed to show it.
 */
export function useMemberDetailListTable(members: OrganizationMemberDetail[]) {
  return useListTable({
    data: members,
    columns: memberDetailColumns,
    getRowId: (member) => member.userId,
    sortOptions: MEMBER_SORT_OPTIONS,
  });
}
