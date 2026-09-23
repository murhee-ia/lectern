"use client";

import {
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";

import type { OrganizationMember } from "@repo/types/organization";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

const columns: Array<ColumnDef<typeof features, OrganizationMember>> = [
  {
    accessorKey: "email",
    header: "Member",
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: (info) => <span className="badge">{info.getValue<string>()}</span>,
  },
  {
    accessorKey: "joinedAt",
    header: "Joined",
    cell: (info) => new Date(info.getValue<string>()).toLocaleDateString(),
  },
];

export function OrganizationAllMembersTable({ members }: { members: OrganizationMember[] }) {
  const table = useTable({
    key: "organization-member-table",
    features,
    columns,
    data: members,
  });

  return (
    <table className="w-full text-left text-sm">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                className="cursor-pointer pb-3 font-semibold select-none"
                onClick={header.column.getToggleSortingHandler()}
              >
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                {{ asc: " ▲", desc: " ▼" }[header.column.getIsSorted() as string] ??
                  null}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} className="border-t border-lectern-white/10">
            {row.getAllCells().map((cell) => (
              <td key={cell.id} className="py-3">
                <table.FlexRender cell={cell} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
