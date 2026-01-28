'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Xmark, NavArrowLeft } from 'iconoir-react';
import { useDrawerStore } from '@/stores/drawer-store';
import { transferApi } from '@/services/transfer-api';
import TransfersPanel from '@/features/transfer/components/TransfersPanel';
import ContactsPanel from '@/features/contacts/components/ContactsPanel';
import TransferDetailsPanel from '@/features/transfer/components/TransferDetailsPanel';
import TransferPreviewPanel from '@/features/transfer/components/TransferPreviewPanel';
import SubscriptionPanel from '@/features/subscription/components/SubscriptionPanel';
import SubscriptionCheckoutPanel from '@/features/subscription/components/SubscriptionCheckoutPanel';
import { PaymentMethodPanel, PaymentPhonePanel, PaymentPromptPanel } from '@/features/payment/components/PaymentPanels';
import AccountPanel from '@/features/account/components/AccountPanel';
import AnalyticsPanel from '@/features/analytics/components/AnalyticsPanel';
import DrawerFooter from './DrawerFooter';

/**
 * AnimatedView - Wrapper for smooth view transitions
 * Applies fade + slide animation when views change
 */
interface AnimatedViewProps {
  children: React.ReactNode;
  isActive: boolean;
  direction?: 'forward' | 'back';
}

const AnimatedView: React.FC<AnimatedViewProps> = ({ children, isActive, direction = 'forward' }) => {
  const [shouldRender, setShouldRender] = useState(isActive);
  const [animationState, setAnimationState] = useState<'entering' | 'visible' | 'exiting'>('visible');

  useEffect(() => {
    if (isActive) {
      setShouldRender(true);
      setAnimationState('entering');
      // Small delay to trigger CSS transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimationState('visible');
        });
      });
    } else if (shouldRender) {
      setAnimationState('exiting');
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 200); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [isActive, shouldRender]);

  if (!shouldRender) return null;

  const getTransformClass = () => {
    if (animationState === 'entering') {
      return direction === 'forward' ? 'translate-x-8 opacity-0' : '-translate-x-8 opacity-0';
    }
    if (animationState === 'exiting') {
      return direction === 'forward' ? '-translate-x-8 opacity-0' : 'translate-x-8 opacity-0';
    }
    return 'translate-x-0 opacity-100';
  };

  return (
    <div
      className={`transition-all duration-200 ease-out ${getTransformClass()}`}
    >
      {children}
    </div>
  );
};

/**
 * SideDrawer - Shared drawer component that slides from the right
 * Uses Zustand for global state management
 * Supports keyboard navigation, focus trap, overlay click to close,
 * and stack-based navigation for nested views with smooth transitions
 */
const SideDrawer: React.FC = () => {
  const {
    isOpen,
    view,
    closeDrawer,
    currentContentView,
    selectedTransfer,
    transferRole,
    popView,
    canGoBack,
    onBeforeBack,
    updateSelectedTransfer,
  } = useDrawerStore();

  // Track previous view for animation direction
  const prevViewRef = useRef(currentContentView);
  const [animationDirection, setAnimationDirection] = useState<'forward' | 'back'>('forward');

  // Determine animation direction based on navigation
  useEffect(() => {
    const prevView = prevViewRef.current;
    if (prevView !== currentContentView) {
      // Going deeper (list -> details -> preview) = forward
      // Going back = back
      const viewDepth: Record<string, number> = {
        'list': 0,
        'transfer-details': 1,
        'transfer-preview': 2,
        'subscription-checkout': 1,
        'payment-method': 0,
        'payment-phone': 1,
        'payment-prompt': 2,
      };
      const prevDepth = viewDepth[prevView] ?? 0;
      const currentDepth = viewDepth[currentContentView] ?? 0;
      setAnimationDirection(currentDepth > prevDepth ? 'forward' : 'back');
      prevViewRef.current = currentContentView;
    }
  }, [currentContentView]);
  const drawerRef = useRef<HTMLDivElement>(null);
  const headerButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Check if we can navigate back
  // Show back button if: navigation stack has entries OR there's a custom back handler (e.g., FilePreviewView)
  const showBackButton = canGoBack() || onBeforeBack !== null;

  // Handle ESC key - go back first, then close
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        // First check if custom back handler wants to handle it
        if (onBeforeBack && onBeforeBack()) {
          return; // Handler took care of it
        }
        // Then check navigation stack
        if (canGoBack()) {
          popView();
        } else {
          closeDrawer();
        }
      }
    },
    [isOpen, closeDrawer, canGoBack, popView, onBeforeBack]
  );

  // Handle header button click (back or close)
  const handleHeaderButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      // First check if custom back handler wants to handle it
      if (onBeforeBack && onBeforeBack()) {
        return; // Handler took care of it
      }
      // Then check navigation stack or close
      if (canGoBack()) {
        popView();
      } else {
        closeDrawer();
      }
    },
    [canGoBack, popView, closeDrawer, onBeforeBack]
  );

  // Focus trap implementation
  const handleTabKey = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen || event.key !== 'Tab') return;

      const focusableElements = drawerRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [isOpen]
  );

  // Store previous active element and focus drawer on open
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Focus header button after animation completes
      setTimeout(() => {
        headerButtonRef.current?.focus();
      }, 300);
    } else if (previousActiveElement.current) {
      // Restore focus when drawer closes
      previousActiveElement.current.focus();
    }
  }, [isOpen]);

  // Add event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleTabKey);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [handleKeyDown, handleTabKey]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Listen for transfer data refresh events (e.g., after version upload)
  useEffect(() => {
    const handleRefreshTransfer = async (event: Event) => {
      const customEvent = event as CustomEvent<{ transferId: string }>;
      const { transferId } = customEvent.detail;
      if (selectedTransfer?.id === transferId) {
        try {
          const response = await transferApi.getTransferById(transferId);
          if (response.data) {
            updateSelectedTransfer(response.data);
          }
        } catch (error) {
          console.error('Failed to refresh transfer data:', error);
        }
      }
    };

    window.addEventListener('refresh-transfer-data', handleRefreshTransfer);
    return () => {
      window.removeEventListener('refresh-transfer-data', handleRefreshTransfer);
    };
  }, [selectedTransfer?.id, updateSelectedTransfer]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      closeDrawer();
    }
  };

  return (
    <>
      {/* Backdrop - same style as AuthPanel (no blur) */}
      <div
        id="ze-drawer-backdrop"
        className={`ze-drawer-backdrop fixed inset-0 bg-black/20 z-[9998] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleOverlayClick}
        aria-hidden={!isOpen}
      />

      {/* Panel - same style as AuthPanel, wider for preview mode */}
      <div
        ref={drawerRef}
        id="ze-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label={view === 'transfers' ? 'Transfers' : view === 'contacts' ? 'Contacts' : view === 'analytics' ? 'Analytics' : view === 'payment' ? 'Payment' : view === 'account' ? 'Account' : 'Subscriptions'}
        className={`ze-drawer-panel fixed top-0 right-0 h-full bg-white z-[9999] shadow-2xl transition-all duration-500 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${
          currentContentView === 'transfer-preview' || view === 'subscriptions' || view === 'payment' || view === 'account' ? 'w-[90vw]' : 'w-[70%]'
        }`}
      >
        {/* Fixed Header with Back/Close Button */}
        <div className="ze-drawer-header flex-shrink-0 bg-white px-6 py-4 border-b border-gray-200 z-10">
          <button
            ref={headerButtonRef}
            type="button"
            onClick={handleHeaderButtonClick}
            className="ze-drawer-close w-12 h-12 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label={showBackButton ? 'Back' : 'Close'}
          >
            {showBackButton ? (
              <NavArrowLeft className="w-6 h-6 text-gray-600" />
            ) : (
              <Xmark className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="ze-drawer-content flex-1 flex flex-col overflow-y-auto">
          <div className="w-full flex-1 px-16 py-8">
            {/* List views with animation */}
            <AnimatedView
              isActive={currentContentView === 'list' && view === 'transfers'}
              direction={animationDirection}
            >
              <TransfersPanel />
            </AnimatedView>

            <AnimatedView
              isActive={currentContentView === 'list' && view === 'contacts'}
              direction={animationDirection}
            >
              <ContactsPanel />
            </AnimatedView>

            {/* Analytics view with animation */}
            <AnimatedView
              isActive={currentContentView === 'list' && view === 'analytics'}
              direction={animationDirection}
            >
              <AnalyticsPanel />
            </AnimatedView>

            {/* Subscriptions view with animation */}
            <AnimatedView
              isActive={currentContentView === 'list' && view === 'subscriptions'}
              direction={animationDirection}
            >
              <SubscriptionPanel />
            </AnimatedView>

            {/* Subscription checkout view with animation */}
            <AnimatedView
              isActive={currentContentView === 'subscription-checkout' && view === 'subscriptions'}
              direction={animationDirection}
            >
              <SubscriptionCheckoutPanel />
            </AnimatedView>

            {/* Transfer details view with animation */}
            <AnimatedView
              isActive={currentContentView === 'transfer-details' && !!selectedTransfer && !!transferRole}
              direction={animationDirection}
            >
              {selectedTransfer && transferRole && (
                <TransferDetailsPanel transfer={selectedTransfer} role={transferRole} />
              )}
            </AnimatedView>

            {/* Transfer preview view with animation */}
            <AnimatedView
              isActive={currentContentView === 'transfer-preview' && !!selectedTransfer}
              direction={animationDirection}
            >
              {selectedTransfer && (
                <TransferPreviewPanel transfer={selectedTransfer} />
              )}
            </AnimatedView>

            {/* Payment method selection view */}
            <AnimatedView
              isActive={currentContentView === 'payment-method' && view === 'payment'}
              direction={animationDirection}
            >
              <PaymentMethodPanel />
            </AnimatedView>

            {/* Payment phone input view */}
            <AnimatedView
              isActive={currentContentView === 'payment-phone' && view === 'payment'}
              direction={animationDirection}
            >
              <PaymentPhonePanel />
            </AnimatedView>

            {/* Payment prompt view */}
            <AnimatedView
              isActive={currentContentView === 'payment-prompt' && view === 'payment'}
              direction={animationDirection}
            >
              <PaymentPromptPanel />
            </AnimatedView>

            {/* Account view (sidebar layout, no animation) */}
            {view === 'account' && <AccountPanel />}
          </div>
          {/* Footer - scrolls with content */}
          <DrawerFooter />
        </div>
      </div>
    </>
  );
};

export default SideDrawer;
