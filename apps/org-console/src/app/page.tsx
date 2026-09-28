import Link from 'next/link';

import { getCurrentMemberships } from '@repo/server/organization/queries';
import { OrganizationRoleBadge } from '@repo/ui/components/customs/organization-role-badge';

import { organizationPath } from '@/lib/utils/organization-routes';

export default async function OrganizationsPage() {
  const memberships = await getCurrentMemberships();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-4 pb-16 sm:pt-8">
      <h1 className="heading-3">Your organizations</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Open an organization you&apos;re the Admin of to manage it. The rest are
        listed for reference.
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {memberships.map((membership) => {
          const summary = (
            <>
              <span className="flex min-w-0 flex-col gap-1.5">
                <span className="truncate font-semibold text-foreground">
                  {membership.name}
                </span>
                <span className="badge badge-highlight self-start capitalize">
                  {membership.plan} plan
                </span>
              </span>
              <OrganizationRoleBadge role={membership.role} />
            </>
          );

          return (
            <li key={membership.id}>
              {membership.role === 'admin' ? (
                <Link
                  href={organizationPath(membership.id)}
                  className="glass-card flex items-center justify-between gap-4 text-foreground transition-colors hover:bg-lectern-white/5 hover:text-foreground"
                >
                  {summary}
                </Link>
              ) : (
                <div className="glass-card flex items-center justify-between gap-4 opacity-60">
                  {summary}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
