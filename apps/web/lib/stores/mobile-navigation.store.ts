'use client';

import { create } from 'zustand';

type MobileNavigationStore = {
  readonly mobileNavigationOpen: boolean;
  readonly setMobileNavigationOpen: (open: boolean) => void;
};

/** Ephemeral shell state only; navigation state is never persisted. */
export const useMobileNavigationStore = create<MobileNavigationStore>((set) => ({
  mobileNavigationOpen: false,
  setMobileNavigationOpen: (mobileNavigationOpen) => set({ mobileNavigationOpen }),
}));
