import { create } from "zustand";

interface SelectedOrganizationState {
  selectedOrganizationId: string | null;
  setSelectedOrganizationId: (serverOrganizationId: string) => void;
}

// Client-only state: only ever written to from inside a useEffect, 
// so it never runs during server rendering. The server-selected 
// organization id is passed in as a prop to the layout, and the 
// store is kept in sync with that value whenever it changes 
// (e.g. after selectOrganizationAction resolves and the 
// layout re-fetches with the newly-confirmed selection).
export const useSelectedOrganizationStore = create<SelectedOrganizationState>((set) => ({
  selectedOrganizationId: null,
  setSelectedOrganizationId: (serverOrganizationId) => set({ selectedOrganizationId: serverOrganizationId }),
}));
