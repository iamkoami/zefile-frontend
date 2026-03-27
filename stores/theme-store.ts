/**
 * Theme Store - Zustand global state for dark mode
 * Manages theme preference (light/dark/system) and resolved theme.
 * The FOWT inline script in layout.tsx handles initial paint;
 * this store keeps runtime state in sync.
 *
 * Dark mode kill switch:
 * - Admin can disable dark mode globally via PlatformConfigs (APPEARANCE.darkModeEnabled)
 * - When disabled, this store forces light mode and ignores user preference
 * - A cookie (ze-dm) is set so the FOWT inline script can read it synchronously
 *   on subsequent page loads without waiting for the API
 */

import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'ze-theme';
const DARK_MODE_COOKIE = 'ze-dm';

// Guard against duplicate matchMedia listeners during HMR
let mediaListenerRegistered = false;

function getSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeClass(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved === 'dark' ? 'dark' : '';
}

// Resolution logic must match the FOWT inline script in app/layout.tsx
function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') return getSystemPreference();
  return theme;
}

/** Set a cookie readable by the FOWT inline script. Max-age 30 days. */
function setDarkModeCookie(enabled: boolean) {
  if (typeof document === 'undefined') return;
  document.cookie = `${DARK_MODE_COOKIE}=${enabled ? '1' : '0'};path=/;max-age=${30 * 24 * 60 * 60};SameSite=Lax`;
}

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  /** When true, dark mode is globally disabled by admin — forced light mode */
  darkModeDisabled: boolean;
  setTheme: (t: Theme) => void;
  /** Called by usePlatformStatus when it receives the darkModeEnabled flag */
  setDarkModeEnabled: (enabled: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  // Always start with 'system' / 'light' to match SSR output.
  // The FOWT inline script handles the visual flash; this store
  // hydrates from localStorage after mount (see _hydrateThemeStore below).
  return {
    theme: 'system',
    resolvedTheme: 'light',
    darkModeDisabled: false,
    setTheme: (t: Theme) => {
      const { darkModeDisabled } = get();
      // If dark mode is globally disabled, ignore attempts to set dark
      const effectiveTheme = darkModeDisabled ? 'light' : t;
      const newResolved = resolveTheme(effectiveTheme);
      applyThemeClass(newResolved);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, t); // Store user's actual preference
      }
      set({ theme: t, resolvedTheme: newResolved });
    },
    setDarkModeEnabled: (enabled: boolean) => {
      setDarkModeCookie(enabled);
      if (!enabled) {
        // Force light mode immediately
        applyThemeClass('light');
        set({ darkModeDisabled: true, resolvedTheme: 'light' });
      } else {
        // Re-enable: resolve from user's stored preference
        const state = get();
        const resolved = resolveTheme(state.theme);
        applyThemeClass(resolved);
        set({ darkModeDisabled: false, resolvedTheme: resolved });
      }
    },
  };
});

// Hydrate from localStorage + register OS media listener.
// Called once on the client after first render.
function _hydrateThemeStore() {
  if (typeof window === 'undefined') return;

  const stored = localStorage.getItem(STORAGE_KEY);
  let initial: Theme = 'system';
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    initial = stored;
  }

  // Check cookie for dark mode kill switch (set by previous API call).
  // No cookie (first visit / private browser) → default to disabled (light mode)
  // to avoid a dark flash before the API confirms the setting.
  const cookieMatch = document.cookie.match(/ze-dm=(\d)/);
  const darkModeDisabled = cookieMatch ? cookieMatch[1] === '0' : true;

  const resolved = darkModeDisabled ? 'light' : resolveTheme(initial);
  applyThemeClass(resolved);
  useThemeStore.setState({ theme: initial, resolvedTheme: resolved, darkModeDisabled });

  // Listen for OS preference changes when theme is 'system'
  if (!mediaListenerRegistered) {
    mediaListenerRegistered = true;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => {
      const state = useThemeStore.getState();
      if (state.darkModeDisabled) return; // Kill switch active — stay light
      if (state.theme === 'system') {
        const newResolved = getSystemPreference();
        applyThemeClass(newResolved);
        useThemeStore.setState({ resolvedTheme: newResolved });
      }
    });
  }
}

// Auto-hydrate on client — use requestAnimationFrame to run after
// React's hydration pass completes, avoiding attribute mismatches.
if (typeof window !== 'undefined') {
  requestAnimationFrame(() => {
    _hydrateThemeStore();
  });
}
