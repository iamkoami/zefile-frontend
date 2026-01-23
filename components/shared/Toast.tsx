'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { create } from 'zustand';
import { Check, X, AlertCircle, Info } from 'lucide-react';

// Toast types
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

// Toast store for global state management
interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (message, type = 'info', duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

// Helper function for easy toast calls
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, 'success', duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, 'error', duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, 'info', duration),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, 'warning', duration),
};

// Individual toast item component
const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({
  toast,
  onRemove,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleRemove = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  }, [toast.id, onRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <Check className="w-5 h-5 text-[#171717]" />;
      case 'error':
        return <X className="w-5 h-5 text-[#171717]" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-[#171717]" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-[#171717]" />;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-[#87E64B]';
      case 'error':
        return 'bg-red-400';
      case 'warning':
        return 'bg-yellow-400';
      case 'info':
      default:
        return 'bg-[#87E64B]';
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-200 ${getBackgroundColor()} ${
        isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      }`}
    >
      <div className="flex-shrink-0">{getIcon()}</div>
      <p className="text-sm font-medium text-[#171717] flex-1">{toast.message}</p>
      <button
        onClick={handleRemove}
        className="flex-shrink-0 p-1 rounded hover:bg-white transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-[#171717]" />
      </button>
    </div>
  );
};

// Toast container component - renders all active toasts
const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 max-w-sm"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  );
};

export default ToastContainer;
