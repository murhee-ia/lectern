import { OrganizationOverviewPlaceholder } from '@/components/organization-overview-placeholder';
import { OrganizationSectionNav } from '@/components/organization-section-nav';

export default async function OrganizationDashboardPage({
  params,
}: PageProps<'/organizations/[organizationId]'>) {
  const { organizationId } = await params;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
      {/* The sections come first in reading order — they're what works today
          — and move into the right-hand column on wide screens. */}
      <OrganizationSectionNav
        organizationId={organizationId}
        className="lg:order-2"
      />
      <OrganizationOverviewPlaceholder className="lg:order-1" />
    </div>
  );
}
