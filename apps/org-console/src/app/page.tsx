import Link from 'next/link';
import { getWorkspaceOrganizationsAction } from '@repo/server/organization';

export default async function OrgConsolePage() {
  const { organizations } = await getWorkspaceOrganizationsAction();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="heading-3">Your organizations</h1>

      <div className="mt-8 space-y-3">
        {organizations.map((organization) => {
          const isAdmin = organization.role === 'admin';
          const content = (
            <>
              <div>
                <p className="font-semibold text-foreground">
                  {organization.name}
                </p>
                <span className="badge badge-highlight mt-1 inline-flex capitalize">
                  {organization.plan} plan
                </span>
              </div>
              <span className="badge capitalize">{organization.role}</span>
            </>
          );

          return isAdmin ? (
            <Link
              key={organization.id}
              href={`/organizations/${organization.id}`}
              className="glass-card flex items-center justify-between transition hover:bg-accent"
            >
              {content}
            </Link>
          ) : (
            <div
              key={organization.id}
              className="glass-card flex items-center justify-between opacity-60"
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
