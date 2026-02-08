"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Menu, NavArrowDown, Sparks } from "iconoir-react";
import MobileMenu from "./MobileMenu";
import LanguageSwitcher from "./LanguageSwitcher";
import CurrencySwitcher from "./CurrencySwitcher";
import AuthPanel from "@/features/auth/components/AuthPanel";
import { authApi } from "@/services/auth-api";
import { apiClient } from "@/services/api-client";
import LoadingFullscreen from "@/components/LoadingFullscreen";
import { useDrawerStore } from "@/stores/drawer-store";
import { useUploadStore } from "@/stores/upload-store";
import { useTransferSelectionStore } from "@/stores/transfer-selection-store";
import { useTranslations as useUploadTranslations } from "next-intl";
import ConfirmationModal from "@/components/shared/ConfirmationModal";
import { subscriptionApi, SubscriptionTier } from "@/services/subscription-api";
import { toast } from "@/components/shared/Toast";

const Header = () => {
  const t = useTranslations("header");
  const tCommon = useTranslations("common");
  const tUpload = useUploadTranslations("uploadProtection");
  const { openDrawer, openAccountView } = useDrawerStore();
  const { canInterrupt, reset: resetUpload } = useUploadStore();
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [showResourcesDropdown, setShowResourcesDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [subscriptionTier, setSubscriptionTier] =
    useState<SubscriptionTier>("free");
  const resourcesTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const userTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Track auth transition for smooth animation
  const [isAuthTransitioning, setIsAuthTransitioning] = useState(false);

  // Track whether initial auth check has completed (prevents flash of unauthenticated UI)
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // Fetch subscription tier
  const fetchSubscription = async () => {
    try {
      const response = await subscriptionApi.getCurrentSubscription();
      if (response.data) {
        setSubscriptionTier(response.data.tier);
      } else {
        setSubscriptionTier("free");
      }
    } catch {
      setSubscriptionTier("free");
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      let authenticated = authApi.isAuthenticated();
      let userData = authApi.getStoredUser();

      // If user data exists (hint of previous login), verify with server via cookie.
      // verifyAuth() calls GET /auth/me — if 401, api-client automatically attempts
      // token refresh and retries. No need for a manual refresh fallback here
      // (double-refresh can trigger replay detection and revoke ALL tokens).
      if (userData) {
        try {
          const verified = await authApi.verifyAuth();
          if (verified) {
            authenticated = true;
            userData = authApi.getStoredUser();
          } else {
            // api-client already tried token refresh internally — session is truly expired
            authenticated = false;
            userData = null;
          }
        } catch {
          // Server unreachable - use cached user data as hint
        }
      }

      setIsAuthenticated(authenticated);
      setUser(userData);

      // Fetch subscription and CSRF token when authenticated
      if (authenticated) {
        apiClient.initCsrfToken();
        fetchSubscription();
      } else {
        setSubscriptionTier("free");
      }
    };

    // Handle custom auth state change event (e.g., from OTP verification during upload)
    const handleAuthStateChange = (
      event: CustomEvent<{
        isAuthenticated: boolean;
        user?: any;
        reason?: string;
      }>,
    ) => {
      setIsAuthTransitioning(true);

      // Handle session expiration - show toast notification
      if (
        !event.detail.isAuthenticated &&
        event.detail.reason === "session_expired"
      ) {
        toast.error(t("sessionExpired"));
      }

      // Short delay to allow fade-out before updating state
      setTimeout(() => {
        setIsAuthenticated(event.detail.isAuthenticated);
        setUser(event.detail.user || null);
        // Fetch subscription after auth state change
        if (event.detail.isAuthenticated) {
          fetchSubscription();
        } else {
          setSubscriptionTier("free");
        }
        // Allow fade-in animation
        setTimeout(() => {
          setIsAuthTransitioning(false);
        }, 50);
      }, 150);
    };

    // Handle open-auth-panel event (from SubscriptionPanel)
    const handleOpenAuthPanel = () => {
      setShowAuthPanel(true);
    };

    // Handle subscription change event (from subscription panel)
    const handleSubscriptionChange = () => {
      fetchSubscription();
    };

    checkAuth().then(() => setIsAuthChecked(true));
    window.addEventListener("storage", checkAuth);
    window.addEventListener(
      "auth-state-change",
      handleAuthStateChange as EventListener,
    );
    window.addEventListener("open-auth-panel", handleOpenAuthPanel);
    window.addEventListener("subscription-changed", handleSubscriptionChange);

    // F-2.2: Clear all Zustand stores on logout to prevent stale state
    const handleClearStores = () => {
      useDrawerStore.getState().closeDrawer();
      useUploadStore.getState().reset();
      useTransferSelectionStore.getState().deselectAll();
    };
    window.addEventListener("clear-all-stores", handleClearStores);

    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener(
        "auth-state-change",
        handleAuthStateChange as EventListener,
      );
      window.removeEventListener("open-auth-panel", handleOpenAuthPanel);
      window.removeEventListener(
        "subscription-changed",
        handleSubscriptionChange,
      );
      window.removeEventListener("clear-all-stores", handleClearStores);
      if (resourcesTimeoutRef.current)
        clearTimeout(resourcesTimeoutRef.current);
      if (userTimeoutRef.current) clearTimeout(userTimeoutRef.current);
    };
  }, []);

  // Auto-close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobileMenuOpen]);

  // Helper to open drawer - drawer is now globally available on all pages
  const handleOpenDrawer = (
    drawerType: "transfers" | "contacts" | "subscriptions" | "analytics",
  ) => {
    openDrawer(drawerType);
  };

  // Helper to open account view - drawer is now globally available on all pages
  const handleOpenAccountView = (view: "settings" | "help") => {
    openAccountView(view);
  };

  const mainMenuItems = [
    { label: t("helpCenter"), href: "/help" },
    { label: t("howItWorks"), href: "/how-it-works" },
    { label: t("pricing"), action: () => handleOpenDrawer("subscriptions") },
    { label: t("advertisers"), href: "/advertisers" },
    { label: t("about"), href: "/about" },
  ];

  const loggedInMenuItems = [
    { label: t("transfers"), action: () => handleOpenDrawer("transfers") },
    /*   { label: t("analytics"), action: () => handleOpenDrawer("analytics") },
    {label: t("accountSettings"), action: () => handleOpenAccountView("settings")}, */
    { label: t("contacts"), action: () => handleOpenDrawer("contacts") },
    {
      label: t("subscription"),
      action: () => handleOpenDrawer("subscriptions"),
    },
  ];

  const resourcesMenuItems = [
    { label: t("about"), href: "/about" },
    { label: t("howItWorks"), href: "/how-it-works" },
    { label: t("advertisers"), href: "/advertisers" },
    { label: t("helpCenter"), href: "/help" },
  ];

  const handleResourcesMouseEnter = () => {
    if (resourcesTimeoutRef.current) {
      clearTimeout(resourcesTimeoutRef.current);
    }
    setShowResourcesDropdown(true);
  };

  const handleResourcesMouseLeave = () => {
    resourcesTimeoutRef.current = setTimeout(() => {
      setShowResourcesDropdown(false);
    }, 300);
  };

  const handleUserMouseEnter = () => {
    if (userTimeoutRef.current) {
      clearTimeout(userTimeoutRef.current);
    }
    setShowUserDropdown(true);
  };

  const handleUserMouseLeave = () => {
    userTimeoutRef.current = setTimeout(() => {
      setShowUserDropdown(false);
    }, 300);
  };

  // Handle logout button click - check for active uploads first
  const handleLogoutClick = () => {
    if (canInterrupt()) {
      // Upload in progress - show confirmation modal
      setShowLogoutConfirmation(true);
      setShowUserDropdown(false);
    } else {
      // No active upload - proceed with logout
      performLogout();
    }
  };

  // Perform the actual logout
  const performLogout = async () => {
    setIsLoggingOut(true);
    setShowUserDropdown(false);
    setShowLogoutConfirmation(false);

    // Reset upload state if any
    resetUpload();

    // Wait for fade-in animation to complete
    await new Promise((resolve) => setTimeout(resolve, 400));

    await authApi.logout();
    setIsAuthenticated(false);
    setUser(null);
    window.location.href = "/";
  };

  // Cancel logout confirmation - keep uploading
  const handleCancelLogout = () => {
    setShowLogoutConfirmation(false);
  };

  return (
    <>
      {/* Full page loading overlay for logout */}
      {isLoggingOut && <LoadingFullscreen />}
      <header id="ze-header" className="ze-header">
        <div className="ze-header-container">
          {/* Left: Hamburger (mobile) + Logo */}
          <div id="ze-header-logo" className="ze-header-left">
            {/* Hamburger - visible below lg */}
            <button
              className="mr-3 w-10 h-10 flex items-center justify-center lg:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label={t("openMenu")}
            >
              <Menu className="w-6 h-6 text-[#171717]" />
            </button>

            <Link href="/" className="flex items-center">
              <Image
                src="/zefile-logo.svg"
                alt={tCommon("appName")}
                width={120}
                height={33}
                priority
                className="w-[90px] h-auto lg:w-[120px]"
              />
            </Link>
          </div>

          {/* Center: Main Menu (desktop only) */}
          <div className="ze-header-center hidden lg:flex">
            <nav
              id="ze-main-menu"
              className={`ze-main-menu flex items-center space-x-1 transition-opacity duration-300 ease-in-out ${
                isAuthTransitioning ? "opacity-0" : "opacity-100"
              }`}
            >
              {isAuthChecked && !isAuthenticated &&
                mainMenuItems.map((item) =>
                  item.action ? (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="ze-menu-item"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <Link
                      key={item.label}
                      href={item.href!}
                      className="ze-menu-item"
                    >
                      {item.label}
                    </Link>
                  ),
                )}

              {/* Logged in menu items */}
              {isAuthChecked && isAuthenticated && (
                <div className="flex items-center space-x-1">
                  {loggedInMenuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="ze-menu-item"
                    >
                      {item.label}
                    </button>
                  ))}

                  {/* Resources Dropdown (logged in only) */}
                  <div
                    className="ze-resources-dropdown relative"
                    onMouseEnter={handleResourcesMouseEnter}
                    onMouseLeave={handleResourcesMouseLeave}
                  >
                    <button className="ze-menu-item flex items-center gap-1">
                      {t("resources")}
                      <NavArrowDown className="w-4 h-4" />
                    </button>

                    {showResourcesDropdown && (
                      <div
                        className="ze-resources-dropdown-menu absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                        onMouseEnter={handleResourcesMouseEnter}
                        onMouseLeave={handleResourcesMouseLeave}
                      >
                        {resourcesMenuItems.map((item) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </nav>
          </div>

          {/* Right: Currency + Language Switcher + Auth/User Menu */}
          <div className="ze-header-right">
            {/* Language + Currency Switchers */}
            <div className="flex items-center">
              <LanguageSwitcher />
              <span className="text-gray-300 text-sm hidden lg:inline">|</span>
              <div className="hidden lg:block">
                <CurrencySwitcher />
              </div>
            </div>

            {/* Separator (desktop only) */}
            <div
              id="ze-menu-separator"
              className={`ze-menu-separator h-6 mx-3 w-px bg-gray-300 hidden lg:block transition-opacity duration-300 ease-in-out ${
                isAuthTransitioning ? "opacity-0" : "opacity-100"
              }`}
            />

            {/* Connect Menu - Desktop only */}
            {isAuthChecked && !isAuthenticated && (
              <div
                id="ze-connect-menu"
                className={`ze-connect-menu hidden lg:flex items-center space-x-1 transition-opacity duration-300 ease-in-out ${
                  isAuthTransitioning ? "opacity-0" : "opacity-100"
                }`}
              >
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setShowAuthPanel(true);
                  }}
                  className="ze-menu-item"
                >
                  {t("login")}
                </button>
                <button
                  onClick={() => {
                    setAuthMode("signup");
                    setShowAuthPanel(true);
                  }}
                  className="ze-button-primary"
                >
                  <span className="font-bold">{t("signupBold")}&nbsp;</span>{" "}
                  -&nbsp;{t("signupSuffix")}
                </button>
              </div>
            )}

            {/* Mobile signup button */}
            {isAuthChecked && !isAuthenticated && (
              <button
                onClick={() => {
                  setAuthMode("signup");
                  setShowAuthPanel(true);
                }}
                className={`ze-button-primary ml-2 mr-1 lg:hidden transition-opacity duration-300 ease-in-out ${
                  isAuthTransitioning ? "opacity-0" : "opacity-100"
                }`}
              >
                <span className="font-bold">{t("signupBold")}</span>
              </button>
            )}

            {/* Mobile avatar - visible on mobile when authenticated */}
            {isAuthChecked && isAuthenticated && user && (
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={`ml-2 lg:hidden w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center transition-opacity duration-300 ease-in-out ${
                  isAuthTransitioning ? "opacity-0" : "opacity-100"
                }`}
                aria-label={t("openMenu")}
              >
                <span className="text-white font-bold text-sm">
                  {user.email?.[0]?.toUpperCase() || "U"}
                </span>
              </button>
            )}

            {/* User Menu - Desktop only */}
            {isAuthChecked && isAuthenticated && user && (
              <div
                className={`hidden lg:flex items-center gap-3 transition-opacity duration-300 ease-in-out ${
                  isAuthTransitioning ? "opacity-0" : "opacity-100"
                }`}
              >
                {/* Upgrade button - Show only for free tier */}
                {subscriptionTier === "free" && (
                  <button
                    onClick={() => handleOpenDrawer("subscriptions")}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#5E53E0] hover:text-[#4a42b8] transition-colors"
                  >
                    <Sparks className="w-4 h-4" />
                    {t("upgrade")}
                  </button>
                )}

                {/* Separator */}
                <div
                  id="ze-menu-separator"
                  className="ze-menu-separator h-6 mx-3 w-px bg-gray-300"
                />

                {/* User dropdown */}
                <div
                  className="ze-user-dropdown relative"
                  onMouseEnter={handleUserMouseEnter}
                  onMouseLeave={handleUserMouseLeave}
                >
                  <button className="ze-user-button flex items-center space-x-3 hover:opacity-80 transition-opacity">
                    <span className="text-sm font-bold text-gray-900">
                      {user.email}
                    </span>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {user.email?.[0]?.toUpperCase() || "U"}
                      </span>
                    </div>
                  </button>

                  {/* User Dropdown Menu */}
                  {showUserDropdown && (
                    <div
                      className="ze-user-dropdown-menu absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 py-3 z-50"
                      onMouseEnter={handleUserMouseEnter}
                      onMouseLeave={handleUserMouseLeave}
                    >
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center">
                            <span className="text-white font-bold">
                              {user.email?.[0]?.toUpperCase() || "U"}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">
                              {user.email}
                            </p>
                            <p className="text-xs text-gray-500">
                              {subscriptionTier === "free"
                                ? t("freePlan")
                                : subscriptionTier === "starter"
                                  ? t("starterPlan")
                                  : t("proPlan")}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            openAccountView("settings");
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          {t("accountSettings")}
                        </button>
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            openAccountView("help");
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          {t("help")}
                        </button>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-gray-100 pt-2">
                        <button
                          onClick={handleLogoutClick}
                          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                        >
                          {t("logout")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <AuthPanel
        isOpen={showAuthPanel}
        onClose={() => setShowAuthPanel(false)}
        mode={authMode}
      />

      {/* Mobile Menu Overlay */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isAuthenticated={isAuthenticated}
        user={user}
        subscriptionTier={subscriptionTier}
        mainMenuItems={mainMenuItems}
        loggedInMenuItems={loggedInMenuItems}
        resourcesMenuItems={resourcesMenuItems}
        onOpenAuth={(mode) => {
          setIsMobileMenuOpen(false);
          setAuthMode(mode);
          setShowAuthPanel(true);
        }}
        onLogout={() => {
          setIsMobileMenuOpen(false);
          handleLogoutClick();
        }}
        onOpenAccountSettings={() => {
          setIsMobileMenuOpen(false);
          handleOpenAccountView("settings");
        }}
      />

      {/* Logout confirmation modal when upload is in progress */}
      <ConfirmationModal
        isOpen={showLogoutConfirmation}
        type="warning"
        title={tUpload("logoutTitle")}
        message={tUpload("logoutMessage")}
        confirmLabel={tUpload("yes")}
        cancelLabel={tUpload("no")}
        onConfirm={performLogout}
        onCancel={handleCancelLogout}
      />
    </>
  );
};

export default Header;
