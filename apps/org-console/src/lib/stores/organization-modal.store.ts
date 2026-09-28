'use client';

import { create } from 'zustand';
import type { OrganizationMemberDetail } from '@repo/types/organization';

type OrganizationModalType = 'memberActivity' | 'inviteMember';

type OrganizationModalPayload = {
  member?: OrganizationMemberDetail;
  memberImageUrl?: string | null;
};

type OrganizationModalStore = {
  type: OrganizationModalType | null;
  isOpen: boolean;
  data?: OrganizationModalPayload;
  onOpen: (
    type: OrganizationModalType,
    data?: OrganizationModalPayload,
  ) => void;
  onClose: () => void;
};

/**
 * Every dialog in an organization's console, opened from anywhere on the page
 * and rendered once by OrganizationModalHost in the organization layout.
 */
export const useOrganizationModal = create<OrganizationModalStore>((set) => ({
  type: null,
  isOpen: false,
  data: undefined,
  onOpen: (type, data) => set({ isOpen: true, type, data }),
  // Closing keeps the type and data: the dialog is still on screen while it
  // animates out, and clearing them would empty it mid-fade. The next onOpen
  // replaces both.
  onClose: () => set({ isOpen: false }),
}));
