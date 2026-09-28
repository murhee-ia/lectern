import { OrganizationAccessProvider } from '@repo/lib/hooks/use-organization-access';
import { requireOrganizationAdmin } from '@repo/server/organization/queries';

import { OrganizationBreadcrumb } from '@/components/organization-breadcrumb';
import { OrganizationHeader } from '@/components/organization-header';
import { OrganizationModalHost } from '@/components/dialogs/modal-dialogs-host';

export default async function OrganizationLayout({
  children,
  params,
}: LayoutProps<'/organizations/[organizationId]'>) {
  const { organizationId } = await params;
  // The console is Admin-only. Gating in the layout rather than per page
  // covers every section under the organization — including ones added later.
  const access = await requireOrganizationAdmin(organizationId);

  return (
    <OrganizationAccessProvider access={access}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-4 pb-16 sm:pt-8">
        <div className="flex flex-col gap-3">
          <OrganizationBreadcrumb
            organizationId={access.organization.id}
            organizationName={access.organization.name}
          />
          <OrganizationHeader organization={access.organization} />
        </div>
        {children}
      </div>
      <OrganizationModalHost organizationId={access.organization.id} />
    </OrganizationAccessProvider>
  );
}
