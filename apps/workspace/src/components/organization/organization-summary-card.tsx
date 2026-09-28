import type { OrganizationSummary } from '@repo/types/organization';

export function OrganizationSummaryCard({
  organization,
}: {
  organization: OrganizationSummary;
}) {
  return (
    <div className="glass-card">
      <p className="text-sm text-foreground/60">Organization</p>
      <h1 className="heading-3 mt-1">{organization.name}</h1>
      <span className="badge badge-highlight mt-3 inline-flex capitalize">
        {organization.plan} plan
      </span>
    </div>
  );
}
