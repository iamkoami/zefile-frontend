/**
 * Auth Utilities
 * Shared authentication helper functions
 */

import { authApi } from '@/services/auth-api';

/**
 * Get the current authenticated user's ID
 * Returns null if no user is logged in
 */
export function getCurrentUserId(): string | null {
  const user = authApi.getStoredUser();
  return user?.id || null;
}

/**
 * Get the current authenticated user's email
 * Returns null if no user is logged in
 */
export function getCurrentUserEmail(): string | null {
  const user = authApi.getStoredUser();
  return user?.email || null;
}

/**
 * Get the current authenticated user's display name
 * Returns null if no user is logged in or name is not set
 */
export function getCurrentUserName(): string | null {
  const user = authApi.getStoredUser();
  if (!user) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || null;
}
