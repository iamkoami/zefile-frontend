"use client";

export const runtime = "edge";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/shared";
import UploadPanel, {
  PanelState,
  ReuseTransferData,
} from "@/features/home/components/UploadPanel";
import FilePreviewPanel from "@/features/transfer/components/FilePreviewPanel";
import TransferOptionsPanel from "@/features/transfer/components/TransferOptionsPanel";
import PaperPlaneAnimation from "@/components/shared/PaperPlaneAnimation";
import HeroText from "@/components/shared/HeroText";
import TimeOfDayBackground from "@/components/shared/TimeOfDayBackground";
import GlobalDragDropOverlay from "@/features/home/components/GlobalDragDropOverlay";
import LoadingFullscreen from "@/components/LoadingFullscreen";
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

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openDrawer, openAccountView } = useDrawerStore();
  const { timeOfDay } = useTimeOfDay();

  const [showOptions, setShowOptions] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [maxUploadSize, setMaxUploadSize] = useState<number>(2147483648); // Default 2GB
  const [isLoading, setIsLoading] = useState(true);
  const [uploadPanelState, setUploadPanelState] =
    useState<PanelState>("initial");
  const [reuseTransferData, setReuseTransferData] =
    useState<ReuseTransferData | null>(null);
  const [showNpsSurvey, setShowNpsSurvey] = useState(false);

  // Poll eligibility check — replaces FloatingPollWidget's former self-fetch
  const { checkForPoll } = usePollEligibility();
  useEffect(() => {
    const timer = setTimeout(() => { checkForPoll('manual'); }, 2000);
    return () => clearTimeout(timer);
  }, [checkForPoll]);

  // User tier state (defaults to 'free' for unauthenticated users)
  const [userTier, setUserTier] = useState<SubscriptionTier>('free');

  // Fetch tier limits from API (dynamic values from admin configuration)
  const tierLimitsData = useTierLimits();

  // Transfer options state - shared between TransferOptionsPanel and UploadPanel
  const [transferOptions, setTransferOptions] = useState<TransferOptions>({
    accessControl: 'private',
    validityDuration: '1', // Will be updated based on tier
    password: '',
    sizeLimit: '2', // Will be updated based on tier (in GB)
  });

  // Handle drawer/account query params from navigation
  useEffect(() => {
    const drawerParam = searchParams.get("drawer");
    const accountParam = searchParams.get("account");

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
  }, [searchParams, openDrawer, openAccountView, router]);

  // Calculate total size of selected files using useMemo
  const selectedFilesSize = useMemo(() => {
    return selectedFiles.reduce((sum, file) => sum + file.size, 0);
  }, [selectedFiles]);

  // Fetch platform configuration and user tier on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // Fetch user-specific config which includes tier
        const response = await platformApi.getUserConfig();
        if (response.data) {
          setMaxUploadSize(response.data.maxUploadSize);
          // Normalize tier to lowercase to match SubscriptionTier type
          const tier = (response.data.tier?.toLowerCase() || 'free') as SubscriptionTier;
          setUserTier(tier);
        }
      } catch (error) {
        console.error("Failed to fetch platform config:", error);
      }
    };
    fetchConfig();
    // Don't block page render - set loading to false immediately
    setIsLoading(false);
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

  const handleToggleOptions = useCallback(() => {
    setShowOptions((prev) => !prev);
  }, []);

  const handleClearReuseData = useCallback(() => {
    setReuseTransferData(null);
  }, []);

  // Close options panel when transfer process starts
  useEffect(() => {
    if (
      uploadPanelState === "otp" ||
      uploadPanelState === "uploading" ||
      uploadPanelState === "cancel-confirm" ||
      uploadPanelState === "complete"
    ) {
      setShowOptions(false);
    }
  }, [uploadPanelState]);

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

  // Show loading screen while fetching configuration
  if (isLoading) {
    return <LoadingFullscreen />;
  }

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
            <HeroText isVisible={true} timeOfDay={timeOfDay} />
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
                onShowOptions={handleToggleOptions}
                maxUploadSize={maxUploadSize}
                selectedFilesSize={selectedFilesSize}
                onPanelStateChange={setUploadPanelState}
                reuseTransferData={reuseTransferData}
                onClearReuseData={handleClearReuseData}
                transferOptions={transferOptions}
                onTransferOptionsChange={setTransferOptions}
                tierLimitsData={tierLimitsData}
                userTier={userTier}
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
                  uploadPanelState !== "complete"
                }
                maxUploadSize={maxUploadSize}
                selectedFilesSize={selectedFilesSize}
                reuseTransferData={reuseTransferData}
                onClearReuseData={handleClearReuseData}
                transferOptions={transferOptions}
                tierLimitsData={tierLimitsData}
              />

              {/* Transfer Options Panel */}
              <TransferOptionsPanel
                isVisible={showOptions}
                hasFilesSelected={selectedFiles.length > 0}
                options={transferOptions}
                onOptionsChange={setTransferOptions}
                onClose={() => setShowOptions(false)}
                userTier={userTier}
                tierLimitsData={tierLimitsData}
              />
            </div>
          </div>
        </main>
      </div>
    </UploadProtectionProvider>
  );
}
