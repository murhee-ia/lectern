import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { ORGANIZATION_SECTIONS } from '@/lib/constants/organization-sections.constants';
import { organizationPath } from '@/lib/utils/organization-routes';

/** The dashboard's way into each section of the organization's console. */
export function OrganizationSectionNav({
  organizationId,
  className = '',
}: {
  organizationId: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="Organization sections"
      className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-1 ${className}`}
    >
      {ORGANIZATION_SECTIONS.map(({ id, label, description, icon: Icon }) => (
        <Link
          key={id}
          href={organizationPath(organizationId, id)}
          className="glass-card group flex items-start gap-4 p-4 text-foreground transition-colors hover:bg-lectern-white/5 hover:text-foreground"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-lectern-white/10 bg-lectern-accent-purple/40 text-highlight">
            <Icon aria-hidden className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-semibold">{label}</span>
            <span className="text-sm text-foreground/60">{description}</span>
          </span>
          <ChevronRight
            aria-hidden
            className="mt-2.5 size-4 shrink-0 text-foreground/40 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      ))}
    </nav>
  );
}
