import type { Category } from '@norsumi/common';
import { create } from 'zustand';

type Composer = 'link' | 'note' | null;

export type CategoryDialogState =
  | { mode: 'create'; parent?: Category | null }
  | { mode: 'edit'; category: Category }
  | null;

interface UiState {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  composer: Composer;
  setComposer: (composer: Composer) => void;
  /** Ids of the grid currently on screen, for ←/→ in the item viewer. */
  categoryDialog: CategoryDialogState;
  setCategoryDialog: (state: CategoryDialogState) => void;
  categoryToDelete: Category | null;
  setCategoryToDelete: (category: Category | null) => void;
  visibleItemIds: string[];
  setVisibleItemIds: (ids: string[]) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  mobileNavOpen: false,
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  composer: null,
  setComposer: (composer) => set({ composer }),
  categoryDialog: null,
  setCategoryDialog: (categoryDialog) => set({ categoryDialog }),
  categoryToDelete: null,
  setCategoryToDelete: (categoryToDelete) => set({ categoryToDelete }),
  visibleItemIds: [],
  setVisibleItemIds: (visibleItemIds) => set({ visibleItemIds }),
}));
