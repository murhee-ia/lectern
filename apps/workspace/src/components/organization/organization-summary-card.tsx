"use client";

import type { WorkspaceOrganizationMembership } from "@repo/types/organization";
import { useSelectedOrganizationId } from "@/lib/hooks/use-selected-organization-id";

export function OrganizationSummaryCard({
  organizations,
  selectedOrganizationId,
}: {
  organizations: WorkspaceOrganizationMembership[];
  selectedOrganizationId: string;
}) {
  const storeSelectedId = useSelectedOrganizationId(selectedOrganizationId);
  const selectedOrganization = organizations.find(
    (organization) => organization.id === storeSelectedId,
  );

  return (
    <div className="glass-card">
      <p className="text-sm text-foreground/60">Organization</p>
      <h1 className="heading-3 mt-1">{selectedOrganization?.name}</h1>
      <span className="badge badge-highlight mt-3 inline-flex capitalize">
        {selectedOrganization?.plan} plan
      </span>
    </div>
  );
}
