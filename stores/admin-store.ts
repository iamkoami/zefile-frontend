/**
 * Admin Store - Zustand global state for Admin Portal
 * Manages admin authentication state and session
 */

import { create } from 'zustand';
import { Admin, AdminRole, adminApi } from '@/services/admin-api';

interface AdminState {
  // Auth state
  admin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mustChangePassword: boolean;

  // Actions
  setAdmin: (admin: Admin | null) => void;
  setMustChangePassword: (value: boolean) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }>;
  logout: () => Promise<void>;
  checkAuth: () => void;

  // Role checks
  hasRole: (role: AdminRole) => boolean;
  canAccessRoute: (requiredRoles: AdminRole[]) => boolean;
}

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<AdminRole, number> = {
  [AdminRole.SUPPORT]: 1,
  [AdminRole.MODERATOR]: 2,
  [AdminRole.SUPER_ADMIN]: 3,
};

export const useAdminStore = create<AdminState>((set, get) => ({
  admin: null,
  isAuthenticated: false,
  isLoading: true,
  mustChangePassword: false,

  setAdmin: (admin) => {
    set({ admin, isAuthenticated: !!admin });
  },

  setMustChangePassword: (value) => {
    set({ mustChangePassword: value });
  },

  login: async (email, password) => {
    set({ isLoading: true });

    const response = await adminApi.login({ email, password });

    if (response.error) {
      set({ isLoading: false });
      return { success: false, error: response.error.message };
    }

    if (response.data) {
      set({
        admin: response.data.admin,
        isAuthenticated: true,
        isLoading: false,
        mustChangePassword: response.data.mustChangePassword,
      });

      return {
        success: true,
        mustChangePassword: response.data.mustChangePassword,
      };
    }

    set({ isLoading: false });
    return { success: false, error: 'Login failed' };
  },

  logout: async () => {
    set({ isLoading: true });
    await adminApi.logout();
    set({
      admin: null,
      isAuthenticated: false,
      isLoading: false,
      mustChangePassword: false,
    });
  },

  checkAuth: () => {
    const admin = adminApi.getStoredAdmin();
    const isAuthenticated = adminApi.isAuthenticated();

    set({
      admin,
      isAuthenticated,
      isLoading: false,
    });
  },

  hasRole: (role) => {
    const { admin } = get();
    if (!admin) return false;

    const adminLevel = ROLE_HIERARCHY[admin.role];
    const requiredLevel = ROLE_HIERARCHY[role];

    return adminLevel >= requiredLevel;
  },

  canAccessRoute: (requiredRoles) => {
    const { admin } = get();
    if (!admin) return false;

    const adminLevel = ROLE_HIERARCHY[admin.role];
    const minRequiredLevel = Math.min(...requiredRoles.map(r => ROLE_HIERARCHY[r]));

    return adminLevel >= minRequiredLevel;
  },
}));

// Listen for session expiry events
if (typeof window !== 'undefined') {
  window.addEventListener('admin-session-expired', () => {
    useAdminStore.getState().setAdmin(null);
  });
}
