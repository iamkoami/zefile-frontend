/**
 * Transfer Selection Store - Zustand state for bulk transfer operations
 * Manages selected transfer IDs for bulk actions (delete, etc.)
 */

import { create } from 'zustand';

interface TransferSelectionState {
  selectedIds: Set<string>;
  isSelectionMode: boolean;

  // Actions
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  deselectAll: () => void;
  setSelectionMode: (enabled: boolean) => void;
  isSelected: (id: string) => boolean;
  getSelectedCount: () => number;
  getSelectedIds: () => string[];
}

export const useTransferSelectionStore = create<TransferSelectionState>((set, get) => ({
  selectedIds: new Set(),
  isSelectionMode: false,

  toggleSelection: (id: string) => {
    const currentSelection = get().selectedIds;
    const newSelection = new Set(currentSelection);

    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }

    // Exit selection mode if no items selected
    const isSelectionMode = newSelection.size > 0;

    set({ selectedIds: newSelection, isSelectionMode });
  },

  selectAll: (ids: string[]) => {
    set({
      selectedIds: new Set(ids),
      isSelectionMode: ids.length > 0,
    });
  },

  deselectAll: () => {
    set({
      selectedIds: new Set(),
      isSelectionMode: false,
    });
  },

  setSelectionMode: (enabled: boolean) => {
    if (!enabled) {
      set({ selectedIds: new Set(), isSelectionMode: false });
    } else {
      set({ isSelectionMode: true });
    }
  },

  isSelected: (id: string) => {
    return get().selectedIds.has(id);
  },

  getSelectedCount: () => {
    return get().selectedIds.size;
  },

  getSelectedIds: () => {
    return Array.from(get().selectedIds);
  },
}));
