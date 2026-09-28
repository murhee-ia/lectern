import type { ORGANIZATION_SECTIONS } from '@/lib/constants/organization-sections.constants';

// Every URL inside an organization's console is built here, so the route
// structure lives in one place instead of as string literals across pages.

export function organizationPath(
  organizationId: string,
  section?: (typeof ORGANIZATION_SECTIONS)[number]['id'],
): string {
  const dashboardPath = `/organizations/${organizationId}`;
  return section ? `${dashboardPath}/${section}` : dashboardPath;
}

export function teamSessionPath(
  organizationId: string,
  sessionId: string,
): string {
  return `${organizationPath(organizationId, 'sessions')}/${sessionId}`;
}
