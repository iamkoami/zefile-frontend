/**
 * Drawer Store - Zustand global state for SideDrawer
 * Manages drawer visibility, navigation stack, and optional payload
 * Supports stack-based navigation for nested views (list -> details -> preview)
 */

import { create } from 'zustand';
import { TransferDto } from '@/services/transfer-api';

// Base drawer views
export type DrawerView = 'transfers' | 'contacts';

// Nested views within the drawer (stack-based navigation)
export type DrawerContentView =
  | 'list'           // Main list view (transfers or contacts)
  | 'transfer-details' // Transfer details (sender or receiver)
  | 'transfer-preview'; // Transfer preview (file gallery)

// Role determines which variant of transfer details to show
export type TransferRole = 'sender' | 'receiver';

export interface DrawerPayload {
  transferId?: string;
  contactId?: string;
  preSelectedTab?: 'sent' | 'received' | 'paid';
  addToTransfer?: boolean;
}

// Navigation stack entry for back button functionality
export interface NavigationEntry {
  contentView: DrawerContentView;
  transfer?: TransferDto;
  role?: TransferRole;
  previousTab?: 'sent' | 'received' | 'paid';
}

interface DrawerState {
  isOpen: boolean;
  view: DrawerView;
  payload: DrawerPayload | null;

  // Stack-based navigation
  navigationStack: NavigationEntry[];
  currentContentView: DrawerContentView;
  selectedTransfer: TransferDto | null;
  transferRole: TransferRole | null;

  // Actions
  openDrawer: (view: DrawerView, payload?: DrawerPayload) => void;
  closeDrawer: () => void;
  setView: (view: DrawerView) => void;
  setPayload: (payload: DrawerPayload | null) => void;

  // Stack navigation actions
  pushView: (contentView: DrawerContentView, transfer?: TransferDto, role?: TransferRole) => void;
  popView: () => void;
  canGoBack: () => boolean;
  resetNavigation: () => void;

  // Direct navigation (no back button - closes drawer on dismiss)
  openDrawerToView: (view: DrawerView, contentView: DrawerContentView, transfer?: TransferDto, role?: TransferRole) => void;
}

export const useDrawerStore = create<DrawerState>((set, get) => ({
  isOpen: false,
  view: 'transfers',
  payload: null,
  navigationStack: [],
  currentContentView: 'list',
  selectedTransfer: null,
  transferRole: null,

  openDrawer: (view, payload) =>
    set({
      isOpen: true,
      view,
      payload: payload ?? null,
      navigationStack: [],
      currentContentView: 'list',
      selectedTransfer: null,
      transferRole: null,
    }),

  closeDrawer: () =>
    set({
      isOpen: false,
      payload: null,
      navigationStack: [],
      currentContentView: 'list',
      selectedTransfer: null,
      transferRole: null,
    }),

  setView: (view) => set({ view }),

  setPayload: (payload) => set({ payload }),

  pushView: (contentView, transfer, role) => {
    const state = get();
    const currentEntry: NavigationEntry = {
      contentView: state.currentContentView,
      transfer: state.selectedTransfer ?? undefined,
      role: state.transferRole ?? undefined,
      previousTab: state.payload?.preSelectedTab,
    };

    set({
      navigationStack: [...state.navigationStack, currentEntry],
      currentContentView: contentView,
      selectedTransfer: transfer ?? state.selectedTransfer,
      transferRole: role ?? state.transferRole,
    });
  },

  popView: () => {
    const state = get();
    if (state.navigationStack.length === 0) return;

    const newStack = [...state.navigationStack];
    const previousEntry = newStack.pop();

    if (previousEntry) {
      set({
        navigationStack: newStack,
        currentContentView: previousEntry.contentView,
        selectedTransfer: previousEntry.transfer ?? null,
        transferRole: previousEntry.role ?? null,
      });
    }
  },

  canGoBack: () => {
    return get().navigationStack.length > 0;
  },

  resetNavigation: () => {
    set({
      navigationStack: [],
      currentContentView: 'list',
      selectedTransfer: null,
      transferRole: null,
    });
  },

  // Open drawer directly to a specific content view without navigation stack
  // Used when opening from outside the drawer (e.g., TransferCompletePanel)
  // Shows close button instead of back button
  openDrawerToView: (view, contentView, transfer, role) =>
    set({
      isOpen: true,
      view,
      payload: null,
      navigationStack: [], // Empty stack = close button shown instead of back
      currentContentView: contentView,
      selectedTransfer: transfer ?? null,
      transferRole: role ?? null,
    }),
}));
