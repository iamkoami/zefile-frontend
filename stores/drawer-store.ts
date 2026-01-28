/**
 * Drawer Store - Zustand global state for SideDrawer
 * Manages drawer visibility, navigation stack, and optional payload
 * Supports stack-based navigation for nested views (list -> details -> preview)
 */

import { create } from 'zustand';
import { TransferDto } from '@/services/transfer-api';
// Import subscription types from single source of truth
import type { SubscriptionTier, BillingPeriod } from '@/services/subscription-api';

// Re-export for convenience
export type { SubscriptionTier, BillingPeriod };

// Base drawer views
export type DrawerView = 'transfers' | 'contacts' | 'subscriptions' | 'payment' | 'account' | 'analytics';

// Account sidebar menu items (sidebar navigation, not stack-based)
export type AccountMenuItem =
  | 'settings'       // Account settings (profile, preferences)
  | 'transactions'   // Transaction history (Story 1-7)
  | 'payouts'        // Payout status (Story 1-8)
  | 'verification'   // Identity verification
  | 'help';          // Help center

// Nested views within the drawer (stack-based navigation)
export type DrawerContentView =
  | 'list'           // Main list view (transfers or contacts)
  | 'transfer-details' // Transfer details (sender or receiver)
  | 'transfer-preview' // Transfer preview (file gallery)
  | 'subscription-checkout' // Subscription checkout/upgrade
  | 'payment-method'  // Payment method selection
  | 'payment-phone'   // Phone number input for mobile money
  | 'payment-prompt'; // Mobile money STK push prompt

// Role determines which variant of transfer details to show
export type TransferRole = 'sender' | 'receiver';

// Payment method type for drawer state
export interface PaymentMethodInfo {
  type: 'card' | 'mobile_money';
  provider?: string;
}

// Payment flow state stored in drawer
export interface PaymentFlowData {
  phoneNumber: string;
  phoneCountryCode: string;
  isPhoneValid: boolean;
  paymentReference: string;
  paymentAmount: number;
  senderEmail: string;
}

// Subscription checkout data (uses types from subscription-api)
export interface SubscriptionCheckoutData {
  tier: SubscriptionTier;
  billingPeriod: BillingPeriod;
  amount: number;
  currency: string;
  countryCode?: string; // Selected country from pricing page
}

export interface DrawerPayload {
  transferId?: string;
  contactId?: string;
  preSelectedTab?: 'sent' | 'received' | 'paid';
  addToTransfer?: boolean;
  // Payment flow data
  paymentMethod?: PaymentMethodInfo;
  paymentFlowData?: PaymentFlowData;
  // Subscription checkout data
  subscriptionCheckout?: SubscriptionCheckoutData;
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

  // Account view sidebar navigation (non-stack based)
  activeAccountMenu: AccountMenuItem;

  // Custom back handler (for nested views within a panel)
  // Returns true if the handler handled the back action, false to proceed with popView
  onBeforeBack: (() => boolean) | null;

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

  // Custom back handler setter
  setOnBeforeBack: (handler: (() => boolean) | null) => void;

  // Direct navigation (no back button - closes drawer on dismiss)
  openDrawerToView: (view: DrawerView, contentView: DrawerContentView, transfer?: TransferDto, role?: TransferRole) => void;

  // Payment flow actions
  setPaymentMethod: (method: PaymentMethodInfo | null) => void;
  setPaymentFlowData: (data: Partial<PaymentFlowData>) => void;
  resetPaymentFlow: () => void;
  openPaymentFlow: (transfer: TransferDto, senderEmail: string) => void;

  // Subscription checkout actions
  setSubscriptionCheckout: (data: SubscriptionCheckoutData | null) => void;
  openSubscriptionCheckout: (tier: SubscriptionTier, billingPeriod: BillingPeriod, amount: number, currency: string, countryCode?: string) => void;

  // Update selected transfer (for refreshing after changes)
  updateSelectedTransfer: (transfer: TransferDto) => void;

  // Account view actions
  setActiveAccountMenu: (menu: AccountMenuItem) => void;
  openAccountView: (menu?: AccountMenuItem) => void;
}

export const useDrawerStore = create<DrawerState>((set, get) => ({
  isOpen: false,
  view: 'transfers',
  payload: null,
  navigationStack: [],
  currentContentView: 'list',
  selectedTransfer: null,
  transferRole: null,
  activeAccountMenu: 'settings',
  onBeforeBack: null,

  openDrawer: (view, payload) =>
    set({
      isOpen: true,
      view,
      payload: payload ?? null,
      navigationStack: [],
      currentContentView: 'list',
      selectedTransfer: null,
      transferRole: null,
      onBeforeBack: null,
    }),

  closeDrawer: () =>
    set({
      isOpen: false,
      payload: null,
      navigationStack: [],
      currentContentView: 'list',
      selectedTransfer: null,
      transferRole: null,
      onBeforeBack: null,
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
      onBeforeBack: null,
    });
  },

  setOnBeforeBack: (handler) => set({ onBeforeBack: handler }),

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
      onBeforeBack: null,
    }),

  // Payment flow actions
  setPaymentMethod: (method) => {
    const state = get();
    set({
      payload: {
        ...state.payload,
        paymentMethod: method ?? undefined,
      },
    });
  },

  setPaymentFlowData: (data) => {
    const state = get();
    set({
      payload: {
        ...state.payload,
        paymentFlowData: {
          phoneNumber: '',
          phoneCountryCode: 'GH',
          isPhoneValid: false,
          paymentReference: '',
          paymentAmount: 0,
          senderEmail: '',
          ...state.payload?.paymentFlowData,
          ...data,
        },
      },
    });
  },

  resetPaymentFlow: () => {
    const state = get();
    set({
      payload: {
        ...state.payload,
        paymentMethod: undefined,
        paymentFlowData: undefined,
      },
    });
  },

  // Open payment flow for a transfer (starts at payment-method view)
  openPaymentFlow: (transfer, senderEmail) => {
    set({
      isOpen: true,
      view: 'payment',
      payload: {
        paymentFlowData: {
          phoneNumber: '',
          phoneCountryCode: 'GH',
          isPhoneValid: false,
          paymentReference: '',
          paymentAmount: transfer.price || 0,
          senderEmail,
        },
      },
      navigationStack: [],
      currentContentView: 'payment-method',
      selectedTransfer: transfer,
      transferRole: null,
      onBeforeBack: null,
    });
  },

  // Subscription checkout actions
  setSubscriptionCheckout: (data) => {
    const state = get();
    set({
      payload: {
        ...state.payload,
        subscriptionCheckout: data ?? undefined,
      },
    });
  },

  openSubscriptionCheckout: (tier, billingPeriod, amount, currency, countryCode) => {
    set({
      isOpen: true,
      view: 'subscriptions',
      payload: {
        subscriptionCheckout: {
          tier,
          billingPeriod,
          amount,
          currency,
          countryCode,
        },
      },
      navigationStack: [{ contentView: 'list' }], // Allow back to pricing view
      currentContentView: 'subscription-checkout',
      selectedTransfer: null,
      transferRole: null,
      onBeforeBack: null,
    });
  },

  // Update selected transfer in place (for refreshing after version upload, etc.)
  updateSelectedTransfer: (transfer) => set({ selectedTransfer: transfer }),

  // Account view actions
  setActiveAccountMenu: (menu) => set({ activeAccountMenu: menu }),

  openAccountView: (menu) =>
    set({
      isOpen: true,
      view: 'account',
      payload: null,
      navigationStack: [],
      currentContentView: 'list',
      selectedTransfer: null,
      transferRole: null,
      activeAccountMenu: menu ?? 'settings',
      onBeforeBack: null,
    }),
}));
