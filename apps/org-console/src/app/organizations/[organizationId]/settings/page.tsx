import { notFound } from 'next/navigation';
import { getOrganizationSettings } from '@repo/server/organization/queries';

import { OrganizationSectionHeading } from '@/components/organization-section-heading';
import { OrganizationSettingsList } from '@/components/organization-settings-list';

export default async function OrganizationSettingsPage({
  params,
}: PageProps<'/organizations/[organizationId]/settings'>) {
  const { organizationId } = await params;
  const settings = await getOrganizationSettings(organizationId);
  if (!settings) notFound();

  return (
    <section className="flex flex-col gap-5">
      <OrganizationSectionHeading section="settings" />
      <OrganizationSettingsList joinCode={settings.joinCode} />
    </section>
  );
}
