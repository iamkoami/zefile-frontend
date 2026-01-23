'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { useDrawerStore } from '@/stores/drawer-store';
import TransfersPanel from './TransfersPanel';
import ContactsPanel from './ContactsPanel';
import TransferDetailsPanel from './TransferDetailsPanel';
import TransferPreviewPanel from './TransferPreviewPanel';
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
  const showBackButton = canGoBack();

  // Handle ESC key - go back first, then close
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        if (canGoBack()) {
          popView();
        } else {
          closeDrawer();
        }
      }
    },
    [isOpen, closeDrawer, canGoBack, popView]
  );

  // Handle header button click (back or close)
  const handleHeaderButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (showBackButton) {
        popView();
      } else {
        closeDrawer();
      }
    },
    [showBackButton, popView, closeDrawer]
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
        aria-label={view === 'transfers' ? 'Transfers' : 'Contacts'}
        className={`ze-drawer-panel fixed top-0 right-0 h-full bg-white z-[9999] shadow-2xl transition-all duration-500 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${
          currentContentView === 'transfer-preview' ? 'w-[90vw]' : 'w-[70%]'
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
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            ) : (
              <X className="w-6 h-6 text-gray-600" />
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
          </div>
          {/* Footer - scrolls with content */}
          <DrawerFooter />
        </div>
      </div>
    </>
  );
};

export default SideDrawer;
