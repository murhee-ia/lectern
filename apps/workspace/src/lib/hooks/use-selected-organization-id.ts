'use client';

import { useEffect } from 'react';
import { useSelectedOrganizationStore } from '@/lib/stores/server-mirror-stores/selected-organization.store';

/**
 * The effective selected-organization id: falls back to
 * `serverSelectedOrganizationId` until the store has actually been
 * written to. This fallback is what every server render (and
 * the client's first hydration pass) uses, with no mismatch possible
 * then kept in sync with the server value whenever it changes (e.g.
 * after selectOrganizationAction resolves and the layout re-fetches with
 * the newly-confirmed selection).
 */
export function useSelectedOrganizationId(
  serverSelectedOrganizationId: string,
): string {
  const storeSelectedId = useSelectedOrganizationStore(
    (state) => state.selectedOrganizationId,
  );
  const setStoreSelectedId = useSelectedOrganizationStore(
    (state) => state.setSelectedOrganizationId,
  );

  useEffect(() => {
    setStoreSelectedId(serverSelectedOrganizationId);
  }, [serverSelectedOrganizationId, setStoreSelectedId]);

  return storeSelectedId ?? serverSelectedOrganizationId;
}
