"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/shared";
import UploadPanel, {
  PanelState,
  ReuseTransferData,
} from "@/features/home/components/UploadPanel";
import FilePreviewPanel from "@/features/transfer/components/FilePreviewPanel";
import PaperPlaneAnimation from "@/components/shared/PaperPlaneAnimation";
import HeroText from "@/components/shared/HeroText";
import TimeOfDayBackground from "@/components/shared/TimeOfDayBackground";
import GlobalDragDropOverlay from "@/features/home/components/GlobalDragDropOverlay";
import FeaturedCreatorsSection from "@/features/home/components/FeaturedCreatorsSection";
import NPSSurveyModal from "@/components/shared/NPSSurveyModal";
import FloatingPollWidget from "@/components/shared/FloatingPollWidget";
import { usePollEligibility } from "@/hooks/usePollEligibility";
import { platformApi } from "@/services/platform-api";
import surveysApi from "@/services/surveys-api";
import { authApi } from "@/services/auth-api";
import ToastContainer from "@/components/shared/Toast";
import { UploadProtectionProvider } from "@/components/providers/UploadProtectionProvider";
import { useDrawerStore } from "@/stores/drawer-store";
import { useTimeOfDay } from "@/hooks/useTimeOfDay";
import { useTierLimits, SubscriptionTier } from "@/hooks/useTierLimits";
import { TransferOptions } from "@/features/transfer/components/TransferOptionsPanel";

export default function HomeClient() {
  const router = useRouter();
  const { openDrawer, openAccountView } = useDrawerStore();
  const { timeOfDay } = useTimeOfDay();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [maxUploadSize, setMaxUploadSize] = useState<number>(2147483648); // Default 2GB
  const [uploadPanelState, setUploadPanelState] =
    useState<PanelState>("initial");
  const [transferMode, setTransferMode] = useState<"test" | "real" | null>(null);
  const [reuseTransferData, setReuseTransferData] =
    useState<ReuseTransferData | null>(null);
  const [showNpsSurvey, setShowNpsSurvey] = useState(false);
  // Poll eligibility check — replaces FloatingPollWidget's former self-fetch
  const { checkForPoll } = usePollEligibility();
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForPoll("manual");
    }, 2000);
    return () => clearTimeout(timer);
  }, [checkForPoll]);

  // User tier state (defaults to 'free' for unauthenticated users)
  const [userTier, setUserTier] = useState<SubscriptionTier>("free");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFirstPaidTransferUsed, setIsFirstPaidTransferUsed] = useState(true);

  // Fetch tier limits from API (dynamic values from admin configuration)
  const tierLimitsData = useTierLimits();

  // Transfer options state - shared between UploadPanel and FilePreviewPanel
  const [transferOptions, setTransferOptions] = useState<TransferOptions>({
    accessControl: "private",
    validityDuration: "1", // Will be updated based on tier
    password: "",
    sizeLimit: "2", // Will be updated based on tier (in GB)
    wallpaperFile: undefined,
    wallpaperPreview: undefined,
  });

  // Cleanup blob URL on unmount
  React.useEffect(() => {
    return () => {
      if (transferOptions.wallpaperPreview) {
        URL.revokeObjectURL(transferOptions.wallpaperPreview);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle drawer/account query params from navigation (read once on mount)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const drawerParam = params.get("drawer");
    const accountParam = params.get("account");

    if (drawerParam) {
      const validDrawers = [
        "transfers",
        "contacts",
        "subscriptions",
        "analytics",
      ];
      if (validDrawers.includes(drawerParam)) {
        openDrawer(
          drawerParam as
            | "transfers"
            | "contacts"
            | "subscriptions"
            | "analytics",
        );
      }
      // Clean up URL
      router.replace("/", { scroll: false });
    }

    if (accountParam) {
      const validViews = ["settings", "help"];
      if (validViews.includes(accountParam)) {
        openAccountView(accountParam as "settings" | "help");
      }
      // Clean up URL
      router.replace("/", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate total size of selected files using useMemo
  const selectedFilesSize = useMemo(() => {
    return selectedFiles.reduce((sum, file) => sum + file.size, 0);
  }, [selectedFiles]);

  // Fetch platform configuration and user tier
  // Runs on mount + re-runs when user logs in (auth-state-change event)
  useEffect(() => {
    const fetchConfig = async () => {
      const user = authApi.getStoredUser();
      if (!user) {
        // Reset to defaults for unauthenticated users
        setUserTier("free");
        setIsAuthenticated(false);
        setMaxUploadSize(2147483648);
        return;
      }
      setIsAuthenticated(true);
      try {
        const response = await platformApi.getUserConfig();
        if (response.data) {
          setMaxUploadSize(response.data.maxUploadSize);
          const tier = (response.data.tier?.toLowerCase() ||
            "free") as SubscriptionTier;
          setUserTier(tier);
          setIsFirstPaidTransferUsed(
            response.data.isFirstPaidTransferUsed ?? true,
          );
        }
      } catch (error) {
        console.error("Failed to fetch platform config:", error);
      }
    };

    fetchConfig();

    const handleAuthChange = () => {
      fetchConfig();
    };
    window.addEventListener("auth-state-change", handleAuthChange);
    return () =>
      window.removeEventListener("auth-state-change", handleAuthChange);
  }, []);

  // Update transfer options defaults when tier limits data loads
  useEffect(() => {
    if (!tierLimitsData.isLoading && userTier) {
      setTransferOptions((prev) => ({
        ...prev,
        validityDuration: tierLimitsData.getDefaultValidity(userTier),
        sizeLimit: tierLimitsData.getDefaultSizeLimit(userTier),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierLimitsData.isLoading, userTier]);

  // Check NPS survey status on mount (only for authenticated users)
  useEffect(() => {
    const checkNpsSurvey = async () => {
      // Only check if user is authenticated
      const user = authApi.getStoredUser();
      if (!user) return;

      try {
        const response = await surveysApi.getNpsSurveyStatus();
        if (response.data?.shouldShow) {
          // Small delay to let page render first
          setTimeout(() => setShowNpsSurvey(true), 1500);
        }
      } catch (error) {
        // Silently fail - NPS survey is not critical
        console.error("Failed to check NPS survey status:", error);
      }
    };
    checkNpsSurvey();
  }, []);

  const handleFilesChange = useCallback((files: File[]) => {
    setSelectedFiles(files);
  }, []);

  const handleAddMoreFiles = useCallback((newFiles: File[]) => {
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleClearReuseData = useCallback(() => {
    setReuseTransferData(null);
  }, []);

  // Listen for add-transfer-files-to-upload event from TransferDetailsPanel
  useEffect(() => {
    const handleAddTransferFiles = (event: CustomEvent<ReuseTransferData>) => {
      const { transferId, files, title } = event.detail;
      if (transferId && files && files.length > 0) {
        setReuseTransferData({ transferId, files, title });
      }
    };

    window.addEventListener(
      "add-transfer-files-to-upload",
      handleAddTransferFiles as EventListener,
    );

    return () => {
      window.removeEventListener(
        "add-transfer-files-to-upload",
        handleAddTransferFiles as EventListener,
      );
    };
  }, []);

  return (
    <UploadProtectionProvider>
      <div id="ze-home-page" className="min-h-screen bg-white">
        {/* Toast notifications */}
        <ToastContainer />

        {/* NPS Survey Modal */}
        {showNpsSurvey && (
          <NPSSurveyModal
            onClose={() => setShowNpsSurvey(false)}
            onSubmitted={() => setShowNpsSurvey(false)}
          />
        )}

        {/* Floating Poll Widget - non-intrusive, bottom-right corner */}
        <FloatingPollWidget />

        {/* Global Drag and Drop Overlay */}
        <GlobalDragDropOverlay onFilesDropped={handleAddMoreFiles} />

        {/* Header */}
        <Header />

        {/* Main Content */}
        <main
          id="ze-main-content"
          className="pt-0 pb-0"
          style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}
        >
          <div
            id="ze-content-panel"
            className={`ze-content-panel ze-time-${timeOfDay}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            {/* Decorative elements - inside panel, on desktop right side */}
            <TimeOfDayBackground timeOfDay={timeOfDay} />
            <HeroText
              isVisible={true}
              timeOfDay={timeOfDay}
              showProofStats
              showUpgradeCta={isAuthenticated && userTier === "free"}
              onUpgradeClick={() => openDrawer("subscriptions")}
            />

            <PaperPlaneAnimation isVisible={true} />

            <div
              id="ze-panels-container"
              className="ze-panels-container"
              style={{
                position: "relative",
                transition: "all 800ms ease-in-out",
                zIndex: 10,
              }}
            >
              {/* Upload Panel */}
              <UploadPanel
                selectedFiles={selectedFiles}
                onFilesChange={handleFilesChange}
                maxUploadSize={maxUploadSize}
                selectedFilesSize={selectedFilesSize}
                onPanelStateChange={setUploadPanelState}
                onTransferModeChange={setTransferMode}
                reuseTransferData={reuseTransferData}
                onClearReuseData={handleClearReuseData}
                transferOptions={transferOptions}
                onTransferOptionsChange={setTransferOptions}
                tierLimitsData={tierLimitsData}
                userTier={userTier}
                isFirstPaidTransferUsed={isFirstPaidTransferUsed}
              />

              {/* File Preview Panel - Visible when files selected OR reuse files OR form is showing */}
              {/* Hidden during OTP, uploading, cancel-confirm, and complete states */}
              <FilePreviewPanel
                files={selectedFiles}
                onRemoveFile={handleRemoveFile}
                onAddMoreFiles={handleAddMoreFiles}
                isVisible={
                  (selectedFiles.length > 0 ||
                    reuseTransferData !== null ||
                    uploadPanelState === "form") &&
                  uploadPanelState !== "otp" &&
                  uploadPanelState !== "uploading" &&
                  uploadPanelState !== "cancel-confirm" &&
                  uploadPanelState !== "complete" &&
                  uploadPanelState !== "test-result"
                }
                maxUploadSize={maxUploadSize}
                selectedFilesSize={selectedFilesSize}
                reuseTransferData={reuseTransferData}
                onClearReuseData={handleClearReuseData}
                transferOptions={transferOptions}
                tierLimitsData={tierLimitsData}
                transferMode={transferMode}
              />

            </div>
          </div>

          {/* Featured Creators Section - outside content panel to avoid overflow:hidden clipping */}
          <FeaturedCreatorsSection />
        </main>
      </div>
    </UploadProtectionProvider>
  );
}
