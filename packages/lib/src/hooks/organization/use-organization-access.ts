'use client';

import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from 'react';
import type {
  AppPermission,
  OrganizationAccess,
} from '@repo/types/organization';

type OrganizationAccessValue = OrganizationAccess & {
  hasPermission: (permission: AppPermission) => boolean;
};

const OrganizationAccessContext = createContext<OrganizationAccessValue | null>(
  null,
);

/**
 * Hands the signed-in user's role and permissions in one organization to every
 * client component below it. A Server Component layout seeds it from
 * getOrganizationAccess(), so client code never fetches or re-derives them.
 */
export function OrganizationAccessProvider({
  access,
  children,
}: {
  access: OrganizationAccess;
  children: ReactNode;
}) {
  const value: OrganizationAccessValue = {
    ...access,
    hasPermission: (permission) => access.permissions.includes(permission),
  };
  // React 19 renders a context directly as its own provider.
  return createElement(OrganizationAccessContext, { value }, children);
}

/**
 * The signed-in user's role and permissions in the current organization. For
 * deciding what to show — every action is still enforced by row-level
 * security, whatever this says.
 */
export function useOrganizationAccess(): OrganizationAccessValue {
  const value = useContext(OrganizationAccessContext);
  if (!value) {
    throw new Error(
      'useOrganizationAccess must be used inside an OrganizationAccessProvider.',
    );
  }
  return value;
}
