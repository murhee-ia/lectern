'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import { ORGANIZATION_SECTIONS } from '@/lib/constants/organization-sections.constants';
import { organizationPath } from '@/lib/utils/organization-routes';

/**
 * Organizations › {organization} › {section} › Session details — read from the
 * URL, so it stays correct on every page under an organization without each
 * page having to describe where it sits.
 */
export function OrganizationBreadcrumb({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const pathname = usePathname();
  // "/organizations/{id}/{section}/{detail}" → ["", "organizations", id, section, detail]
  const [, , , sectionSegment, detailSegment] = pathname.split('/');
  const section = ORGANIZATION_SECTIONS.find(({ id }) => id === sectionSegment);

  const crumbs = [
    { label: 'Organizations', href: '/' },
    { label: organizationName, href: organizationPath(organizationId) },
    ...(section
      ? [
          {
            label: section.label,
            href: organizationPath(organizationId, section.id),
          },
        ]
      : []),
    ...(section?.id === 'sessions' && detailSegment
      ? [{ label: 'Session details', href: pathname }]
      : []),
  ];

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-foreground/60">
        {crumbs.map((crumb, index) => {
          const isCurrentPage = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && (
                <ChevronRight aria-hidden className="size-3.5 shrink-0" />
              )}
              {isCurrentPage ? (
                <span
                  aria-current="page"
                  className="max-w-48 truncate text-foreground sm:max-w-xs"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="max-w-48 truncate text-foreground/60 hover:text-foreground sm:max-w-xs"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
