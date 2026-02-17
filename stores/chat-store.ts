/**
 * Chat Store - Zustand store for support chat state management
 * Manages conversation state, messages, and visitor identity
 */

import { create } from 'zustand';
import {
  supportApi,
  SupportMessage,
  ConversationCategory,
  ConversationStatus,
} from '@/services/support-api';

const CONVERSATION_ID_KEY = 'zefile-support-conversation-id';
const VISITOR_EMAIL_KEY = 'zefile-support-visitor-email';

export interface ChatContext {
  pageType?: 'download' | 'transfers' | 'home' | 'account';
  shortCode?: string;
  transferId?: string;
  transferStatus?: string;
  hasPassword?: boolean;
  isExpired?: boolean;
}

interface ChatState {
  isOpen: boolean;
  conversationId: string | null;
  messages: SupportMessage[];
  isLoading: boolean;
  unreadCount: number;
  error: string | null;
  isEscalated: boolean;
  isAiHandled: boolean;
  isResolved: boolean;
  conversationStatus: ConversationStatus | null;
  visitorEmail: string | null;
  context: ChatContext | undefined;
  isInitialized: boolean;

  // Actions
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  startConversation: (
    category: ConversationCategory,
    message: string
  ) => Promise<void>;
  loadConversation: () => Promise<void>;
  clearChat: () => void;
  resolveAndClear: () => Promise<void>;
  escalateConversation: () => Promise<void>;
  setVisitorEmail: (email: string) => void;
  setContext: (ctx: ChatContext | undefined) => void;
  initFromStorage: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  isOpen: false,
  conversationId: null,
  messages: [],
  isLoading: false,
  unreadCount: 0,
  error: null,
  isEscalated: false,
  isAiHandled: true,
  isResolved: false,
  conversationStatus: null,
  visitorEmail: null,
  context: undefined,
  isInitialized: false,

  initFromStorage: () => {
    if (typeof window === 'undefined' || get().isInitialized) return;
    try {
      const storedId = localStorage.getItem(CONVERSATION_ID_KEY);
      const storedEmail = localStorage.getItem(VISITOR_EMAIL_KEY);
      set({
        conversationId: storedId,
        visitorEmail: storedEmail,
        isInitialized: true,
      });
    } catch {
      set({ isInitialized: true });
    }
  },

  openChat: () => {
    const state = get();
    if (!state.isInitialized) {
      state.initFromStorage();
    }
    set({ isOpen: true, unreadCount: 0 });

    const { conversationId, messages } = get();
    if (conversationId && messages.length === 0) {
      get().loadConversation();
    }
  },

  closeChat: () => set({ isOpen: false }),

  toggleChat: () => {
    const { isOpen } = get();
    if (isOpen) {
      get().closeChat();
    } else {
      get().openChat();
    }
  },

  sendMessage: async (content: string) => {
    const { conversationId, visitorEmail } = get();
    if (!conversationId) return;

    // Optimistic add
    const tempMessage: SupportMessage = {
      id: `temp-${Date.now()}`,
      content,
      senderType: 'user',
      createdAt: new Date().toISOString(),
      isAction: false,
    };
    set((state) => ({
      messages: [...state.messages, tempMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const response = await supportApi.sendMessage(conversationId, {
        content,
        visitorEmail: visitorEmail || undefined,
      });

      if (response.error) {
        set({
          isLoading: false,
          error: response.error.errorKey || response.error.message,
        });
        return;
      }

      if (response.data) {
        // Backend returns { messages: [userMsg, aiMsg] } — only the 2 new messages.
        // Replace temp message with real user message, then append AI response.
        // Deduplicate by id to handle race with polling loadConversation.
        const newMessages = response.data.messages || [];
        set((state) => {
          const withoutTemp = state.messages.filter((m) => m.id !== tempMessage.id);
          const existingIds = new Set(withoutTemp.map((m) => m.id));
          const uniqueNew = newMessages.filter((m) => !existingIds.has(m.id));
          return {
            messages: [...withoutTemp, ...uniqueNew],
            isLoading: false,
          };
        });
      }
    } catch {
      set({ isLoading: false, error: 'error' });
    }
  },

  startConversation: async (
    category: ConversationCategory,
    message: string
  ) => {
    const { visitorEmail, context } = get();
    set({ isLoading: true, error: null });

    try {
      // Check for existing active conversation before creating a new one
      const activeResponse = await supportApi.getActiveConversation(visitorEmail || undefined);
      if (activeResponse.data) {
        const active = activeResponse.data;
        try {
          localStorage.setItem(CONVERSATION_ID_KEY, active.id);
        } catch {
          // localStorage full or unavailable
        }
        set({
          conversationId: active.id,
          messages: active.messages || [],
          isEscalated: active.status === 'waiting_on_agent',
          isAiHandled: active.isAiHandled,
          isResolved: active.status === 'resolved' || active.status === 'closed',
          conversationStatus: active.status,
          isLoading: false,
        });
        // Resume existing conversation — don't resend the starter message
        return;
      }

      const metadata: Record<string, unknown> = {};
      if (context) {
        Object.assign(metadata, context);
      }
      if (typeof window !== 'undefined') {
        metadata.pageUrl = window.location.href;
      }

      const response = await supportApi.createConversation({
        category,
        message,
        visitorEmail: visitorEmail || undefined,
        shortCode: context?.shortCode,
        metadata,
      });

      if (response.error) {
        set({
          isLoading: false,
          error: response.error.errorKey || response.error.message,
        });
        return;
      }

      if (response.data) {
        const { id, messages } = response.data;
        try {
          localStorage.setItem(CONVERSATION_ID_KEY, id);
        } catch {
          // localStorage full or unavailable
        }
        set({
          conversationId: id,
          messages,
          isLoading: false,
        });
      }
    } catch {
      set({ isLoading: false, error: 'error' });
    }
  },

  loadConversation: async () => {
    const { conversationId, visitorEmail, messages } = get();
    if (!conversationId) return;

    // Show loading state when resuming a conversation with no messages yet
    const isResume = messages.length === 0;
    if (isResume) {
      set({ isLoading: true });
    }

    try {
      const response = await supportApi.getConversation(
        conversationId,
        visitorEmail || undefined,
      );

      if (response.error) {
        // Conversation may have been deleted or is inaccessible
        if (response.status === 404 || response.status === 403) {
          try {
            localStorage.removeItem(CONVERSATION_ID_KEY);
          } catch {
            // ignore
          }
          set({ conversationId: null, messages: [], isLoading: false });
        } else if (isResume) {
          set({ isLoading: false });
        }
        return;
      }

      if (response.data) {
        const prevMessageCount = get().messages.length;
        const newMessageCount = response.data.messages.length;
        const isOpen = get().isOpen;
        const status = response.data.status;

        set({
          messages: response.data.messages,
          conversationStatus: status,
          isEscalated: status === 'waiting_on_agent',
          isAiHandled: response.data.isAiHandled,
          isResolved: status === 'resolved' || status === 'closed',
          isLoading: false,
          // Increment unread if chat is closed and new messages arrived
          unreadCount:
            !isOpen && newMessageCount > prevMessageCount
              ? get().unreadCount + (newMessageCount - prevMessageCount)
              : get().unreadCount,
        });
      }
    } catch {
      // Network error — don't clear conversation, user can retry
      if (isResume) {
        set({ isLoading: false });
      }
    }
  },

  escalateConversation: async () => {
    const { conversationId, visitorEmail } = get();
    if (!conversationId) return;

    try {
      const response = await supportApi.escalateConversation(
        conversationId,
        visitorEmail || undefined,
      );
      if (response.data) {
        // Backend returns conversation without messages relation —
        // only set isEscalated, then reload full conversation
        set({ isEscalated: true });
        await get().loadConversation();
      }
    } catch {
      // Silent failure — user can retry
    }
  },

  clearChat: () => {
    try {
      localStorage.removeItem(CONVERSATION_ID_KEY);
    } catch {
      // ignore
    }
    set({
      conversationId: null,
      messages: [],
      unreadCount: 0,
      error: null,
      isEscalated: false,
      isAiHandled: true,
      isResolved: false,
      conversationStatus: null,
    });
  },

  resolveAndClear: async () => {
    const { conversationId, visitorEmail } = get();
    if (conversationId) {
      // Resolve on backend (fire-and-forget — don't block UI)
      supportApi
        .resolveConversation(conversationId, visitorEmail || undefined)
        .catch(() => {
          // Silent — conversation may already be resolved
        });
    }
    get().clearChat();
  },

  setVisitorEmail: (email: string) => {
    try {
      localStorage.setItem(VISITOR_EMAIL_KEY, email);
    } catch {
      // ignore
    }
    set({ visitorEmail: email });
  },

  setContext: (ctx: ChatContext | undefined) => {
    set({ context: ctx });
  },
}));
