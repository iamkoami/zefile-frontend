import { useState, useEffect, useCallback } from "react";
import { platformApi, PlatformStatus } from "@/services/platform-api";

const CACHE_KEY = "ze-platform-status";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const POLL_INTERVAL = 60 * 1000; // 60 seconds (used during maintenance)

interface CachedStatus {
  data: PlatformStatus;
  timestamp: number;
}

function getCachedStatus(): PlatformStatus | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedStatus = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function setCachedStatus(data: PlatformStatus): void {
  try {
    const cached: CachedStatus = { data, timestamp: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // sessionStorage not available
  }
}

/**
 * Hook that checks platform status (maintenance/waitlist) on mount.
 * Caches result for 5 minutes to avoid hammering on every navigation.
 * When maintenance is active, polls every 60 seconds for auto-recovery.
 *
 * IMPORTANT: Initial state is always null/loading to match server-rendered HTML.
 * sessionStorage is read in useEffect (client-only) to avoid hydration mismatch.
 */
export function usePlatformStatus() {
  // Always start null to match SSR output (sessionStorage not available on server)
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    const response = await platformApi.getStatus();
    if (!response.error && response.data) {
      setStatus(response.data);
      setCachedStatus(response.data);
    }
    setLoading(false);
  }, []);

  // On mount: read cache first, then fetch fresh data
  useEffect(() => {
    const cached = getCachedStatus();
    if (cached) {
      setStatus(cached);
      setLoading(false);
    }
    fetchStatus();
  }, [fetchStatus]);

  // Poll during maintenance mode for auto-recovery
  useEffect(() => {
    if (!status?.maintenance) return;

    const interval = setInterval(async () => {
      const response = await platformApi.getStatus();
      if (!response.error && response.data) {
        setStatus(response.data);
        setCachedStatus(response.data);

        // If maintenance ended, clear cache and reload
        if (!response.data.maintenance) {
          sessionStorage.removeItem(CACHE_KEY);
          window.location.reload();
        }
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [status?.maintenance]);

  return { status, loading };
}

export default usePlatformStatus;
