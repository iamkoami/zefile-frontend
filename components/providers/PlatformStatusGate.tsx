"use client";

import { usePathname } from "next/navigation";
import usePlatformStatus from "@/hooks/usePlatformStatus";
import MaintenancePage from "@/components/MaintenancePage";
import WaitlistPage from "@/components/WaitlistPage";

/**
 * Gate component that intercepts the app when maintenance or waitlist mode is active.
 *
 * Priority: maintenance > waitlist > normal app.
 *
 * Exemptions:
 * - Download pages (/downloads/*) bypass maintenance only if maintenanceAllowDownloads is true
 */
export default function PlatformStatusGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status, loading } = usePlatformStatus();

  // Server-side middleware now handles the initial gate (no flash on first load).
  // This client-side gate is a secondary defense for SPA navigation
  // and handles auto-recovery polling during maintenance.
  if (loading || !status) return <>{children}</>;

  const isDownloadPage = pathname?.startsWith("/downloads");
  // Profile pages use the (profile)/[handle] route group — pathname is /{handle}
  // Exclude known app routes to avoid false positives
  const APP_ROUTES = [
    "/downloads", "/deliver", "/about", "/pricing", "/contact-us", "/fr",
    "/blog", "/help", "/how-it-works", "/jobs", "/payment", "/presentation",
    "/press", "/privacy", "/r", "/review", "/security", "/terms", "/test-page",
    "/maintenance", "/waitlist",
  ];
  const isProfilePage =
    pathname !== null &&
    /^\/[a-zA-Z0-9_-]+$/.test(pathname) &&
    !APP_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + "/"),
    );

  // Maintenance takes priority over everything
  // Download pages are only exempt when maintenanceAllowDownloads is true
  // Creator profile pages are always exempt (remain accessible during maintenance)
  if (status.maintenance) {
    const downloadExempt = isDownloadPage && status.maintenanceAllowDownloads;
    if (!downloadExempt && !isProfilePage) {
      return (
        <MaintenancePage
          message={status.maintenanceMessage}
          estimate={status.maintenanceEstimate}
        />
      );
    }
  }

  // Waitlist mode — blocks all pages (same as maintenance)
  if (status.waitlist) {
    return <WaitlistPage />;
  }

  return <>{children}</>;
}
