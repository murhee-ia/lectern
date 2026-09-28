import type { OrganizationSummary } from '@repo/types/organization';

/** The organization's name and plan, above every page of its console. */
export function OrganizationHeader({
  organization,
}: {
  organization: OrganizationSummary;
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <h1 className="heading-3 min-w-0 break-words">{organization.name}</h1>
      <span className="badge badge-highlight capitalize">
        {organization.plan} plan
      </span>
    </header>
  );
}
