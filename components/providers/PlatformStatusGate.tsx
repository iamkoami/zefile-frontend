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

  // While fetching status, render children so normal mode has zero delay.
  // The lazy initializer in usePlatformStatus reads sessionStorage synchronously,
  // so if maintenance/waitlist was cached, `status` is already set on first frame
  // and we skip straight to the maintenance/waitlist page below — no flash.
  if (loading || !status) return <>{children}</>;

  const isDownloadPage = pathname?.startsWith("/downloads");

  // Maintenance takes priority over everything
  // Download pages are only exempt when maintenanceAllowDownloads is true
  if (status.maintenance) {
    const downloadExempt = isDownloadPage && status.maintenanceAllowDownloads;
    if (!downloadExempt) {
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
