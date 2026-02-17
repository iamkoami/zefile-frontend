"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Xmark,
  SendDiagonal,
  ChatBubble,
  Download,
  CreditCard,
  Lock,
  Clock,
  HelpCircle,
  NavArrowLeft,
  ThumbsUp,
  ThumbsDown,
  RefreshDouble,
} from "iconoir-react";
import { useChatStore, ChatContext } from "@/stores/chat-store";
import { authApi } from "@/services/auth-api";
import { ConversationCategory, SupportMessage } from "@/services/support-api";

// ─── Types ─────────────────────────────────────────────────────

interface ChatWidgetProps {
  context?: ChatContext;
}

interface StarterOption {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  labelKey: string;
  category: ConversationCategory;
  messageKey?: string;
}

// ─── Helpers ───────────────────────────────────────────────────

function getRelativeTime(
  dateStr: string,
  t: ReturnType<typeof useTranslations>,
): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return t("justNow");
  if (diffMin < 60) return t("minutesAgo", { count: diffMin });
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return t("hoursAgo", { count: diffHours });
  return new Date(dateStr).toLocaleDateString();
}

/** Basic markdown: **bold**, *italic*, `code`, [link](url) */
function renderMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      parts.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={key++}>{match[3]}</em>);
    } else if (match[4]) {
      parts.push(
        <code key={key++} className="bg-gray-100 px-1 py-0.5 rounded text-xs">
          {match[4]}
        </code>,
      );
    } else if (match[5] && match[6]) {
      parts.push(
        <a
          key={key++}
          href={match[6]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#5E53E0] underline"
        >
          {match[5]}
        </a>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Default starters ─────────────────────────────────────────

const DEFAULT_STARTERS: StarterOption[] = [
  { icon: Download, labelKey: "starter.download", category: "download" },
  { icon: CreditCard, labelKey: "starter.payment", category: "payment" },
  { icon: Lock, labelKey: "starter.access", category: "download" },
  { icon: HelpCircle, labelKey: "starter.other", category: "general" },
];

function getStarters(context?: ChatContext): StarterOption[] {
  if (context?.pageType !== "download") return DEFAULT_STARTERS;

  const starters: StarterOption[] = [];

  if (context.isExpired) {
    starters.push({
      icon: Clock,
      labelKey: "starter.expired",
      messageKey: "starter.expiredMessage",
      category: "download",
    });
  }

  if (context.hasPassword) {
    starters.push({
      icon: Lock,
      labelKey: "starter.password",
      messageKey: "starter.passwordMessage",
      category: "download",
    });
  }

  starters.push(
    { icon: Download, labelKey: "starter.download", category: "download" },
    { icon: CreditCard, labelKey: "starter.payment", category: "payment" },
    { icon: HelpCircle, labelKey: "starter.other", category: "general" },
  );

  return starters;
}

// ─── Sub-components ────────────────────────────────────────────

function ChatHeader({
  onClose,
  onBack,
}: {
  onClose: () => void;
  onBack?: () => void;
}) {
  const t = useTranslations("support");

  return (
    <div className={`flex items-center px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg ${onBack ? "relative justify-center" : "justify-between"}`}>
      {onBack ? (
        <>
          <button
            onClick={onBack}
            className="absolute left-4 w-7 h-7 rounded-full bg-[#5E53E0] text-white flex items-center justify-center hover:bg-[#4d44c7] transition-colors"
          >
            <NavArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#87E64B]" />
            <span className="font-semibold text-sm text-[#171717]">ZeFile</span>
            <span className="text-xs text-gray-500">{t("title")}</span>
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <Xmark className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#87E64B]" />
            <span className="font-semibold text-sm text-[#171717]">Zefi</span>
            <span className="text-xs text-gray-500">{t("title")}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <Xmark className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}

function MessageFeedback({
  messageId,
  feedbackGiven,
  onFeedback,
}: {
  messageId: string;
  feedbackGiven: Record<string, "up" | "down">;
  onFeedback: (messageId: string, type: "up" | "down") => void;
}) {
  const given = feedbackGiven[messageId];

  if (given) {
    return (
      <div className="flex items-center gap-1 mt-1">
        {given === "up" ? (
          <ThumbsUp className="w-3 h-3 text-[#87E64B]" />
        ) : (
          <ThumbsDown className="w-3 h-3 text-red-400" />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={() => onFeedback(messageId, "up")}
        className="p-0.5 text-gray-300 hover:text-[#87E64B] transition-colors"
        title="Helpful"
      >
        <ThumbsUp className="w-3 h-3" />
      </button>
      <button
        onClick={() => onFeedback(messageId, "down")}
        className="p-0.5 text-gray-300 hover:text-red-400 transition-colors"
        title="Not helpful"
      >
        <ThumbsDown className="w-3 h-3" />
      </button>
    </div>
  );
}

function ChatMessageBubble({
  message,
  feedbackGiven,
  onFeedback,
}: {
  message: SupportMessage;
  feedbackGiven: Record<string, "up" | "down">;
  onFeedback: (messageId: string, type: "up" | "down") => void;
}) {
  const t = useTranslations("support");
  const isUser = message.senderType === "user";
  const isSystem = message.senderType === "system";
  const isAi = message.senderType === "ai";

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`group flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
          isUser
            ? "bg-[#87E64B] text-[#171717] rounded-br-none"
            : "bg-gray-100 text-[#171717] rounded-bl-none"
        }`}
      >
        {!isUser && (
          <div className="text-xs font-medium text-[#5E53E0] mb-1">
            {message.senderType === "agent"
              ? (message.metadata?.senderName as string) || "Agent"
              : "Zefi"}
          </div>
        )}
        <div className="whitespace-pre-wrap break-words">
          {isUser ? message.content : renderMarkdown(message.content)}
        </div>
        <div
          className={`text-[10px] mt-1 ${
            isUser ? "text-[#171717]/50" : "text-gray-400"
          }`}
        >
          {getRelativeTime(message.createdAt, t)}
        </div>
        {isAi && !message.id.startsWith("temp-") && (
          <MessageFeedback
            messageId={message.id}
            feedbackGiven={feedbackGiven}
            onFeedback={onFeedback}
          />
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  const t = useTranslations("support");

  return (
    <div className="flex justify-start mb-3">
      <div className="bg-gray-100 px-3 py-2 rounded-lg rounded-bl-none">
        <div className="text-xs font-medium text-[#5E53E0] mb-1">Zefi</div>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <span>{t("typing")}</span>
          <span className="flex gap-0.5">
            <span
              className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </span>
        </div>
      </div>
    </div>
  );
}

function EmailPrompt({ onSubmit }: { onSubmit: (email: string) => void }) {
  const t = useTranslations("support");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!isValidEmail(email)) {
      setError(t("invalidEmail"));
      return;
    }
    setError("");
    onSubmit(email);
  };

  return (
    <div className="p-4 space-y-3">
      <p className="text-sm text-gray-600">{t("enterEmail")}</p>
      <input
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (error) setError("");
        }}
        placeholder={t("emailPlaceholder")}
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent"
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={handleSubmit}
        className="w-full py-2 bg-[#5E53E0] text-white rounded text-sm font-medium hover:bg-[#4d44c7] transition-colors"
      >
        {t("continue")}
      </button>
    </div>
  );
}

function ConversationStarters({
  context,
  onSelect,
}: {
  context?: ChatContext;
  onSelect: (category: ConversationCategory, message: string) => void;
}) {
  const t = useTranslations("support");
  const starters = getStarters(context);

  const user = authApi.getStoredUser();
  const firstName = user?.firstName;

  return (
    <div className="flex-1 px-4 pt-6 pb-12 space-y-4">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-[#171717]">
          {firstName
            ? t("greetingWithName", { name: firstName })
            : t("greeting")}
        </h3>
        <p className="text-sm text-gray-500">{t("subtitle")}</p>
      </div>
      <div className="space-y-2 pt-4">
        {starters.map((starter) => (
          <button
            key={starter.labelKey}
            onClick={() =>
              onSelect(
                starter.category,
                t(starter.messageKey || starter.labelKey),
              )
            }
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-gray-200 hover:border-[#5E53E0] hover:bg-[#5E53E0]/5 transition-all text-left text-sm"
          >
            <starter.icon className="w-5 h-5 text-[#5E53E0] flex-shrink-0" />
            <span className="text-[#171717]">{t(starter.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LeaveConversationPrompt({
  onContinue,
  onCloseAndNew,
}: {
  onContinue: () => void;
  onCloseAndNew: () => void;
}) {
  const t = useTranslations("support");

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 space-y-4">
      <p className="text-sm font-medium text-[#171717] text-center">
        {t("leave.title")}
      </p>
      <div className="w-full space-y-2">
        <button
          onClick={onContinue}
          className="w-full py-2.5 bg-[#5E53E0] text-white rounded text-sm font-medium hover:bg-[#4d44c7] transition-colors"
        >
          {t("leave.continueChat")}
        </button>
        <button
          onClick={onCloseAndNew}
          className="w-full py-2.5 border border-gray-300 text-[#171717] rounded text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          {t("leave.closeAndNew")}
        </button>
      </div>
    </div>
  );
}

function SatisfactionRating({
  onRate,
  onNewConversation,
}: {
  onRate: (rating: "up" | "down") => void;
  onNewConversation: () => void;
}) {
  const t = useTranslations("support");
  const [rated, setRated] = useState(false);

  const handleRate = (rating: "up" | "down") => {
    setRated(true);
    onRate(rating);
  };

  return (
    <div className="text-center py-4 space-y-3">
      <p className="text-xs text-gray-500">{t("resolved")}</p>

      {!rated ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-[#171717]">
            {t("rateExperience")}
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => handleRate("up")}
              className="p-2.5 rounded-full border border-gray-200 hover:border-[#87E64B] hover:bg-[#87E64B]/10 transition-all"
              title="Good"
            >
              <ThumbsUp className="w-5 h-5 text-gray-500 hover:text-[#87E64B]" />
            </button>
            <button
              onClick={() => handleRate("down")}
              className="p-2.5 rounded-full border border-gray-200 hover:border-red-400 hover:bg-red-50 transition-all"
              title="Could be better"
            >
              <ThumbsDown className="w-5 h-5 text-gray-500 hover:text-red-400" />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#87E64B] font-medium">
          {t("ratedThanks")}
        </p>
      )}

      <button
        onClick={onNewConversation}
        className="flex items-center gap-1.5 mx-auto text-xs text-[#5E53E0] hover:underline transition-colors"
      >
        <RefreshDouble className="w-3.5 h-3.5" />
        {t("newConversation")}
      </button>
    </div>
  );
}

function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (content: string) => void;
  disabled: boolean;
}) {
  const t = useTranslations("support");
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [value]);

  return (
    <div className="p-3 border-t border-gray-100 bg-white rounded-b-lg">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("placeholder")}
          rows={1}
          maxLength={2000}
          className="flex-1 resize-none px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent"
          disabled={disabled}
        />
        <button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className="p-2 bg-[#5E53E0] text-white rounded-lg hover:bg-[#4d44c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <SendDiagonal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main ChatWidget ───────────────────────────────────────────

const ChatWidget: React.FC<ChatWidgetProps> = ({ context: contextProp }) => {
  const t = useTranslations("support");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [showLeavePrompt, setShowLeavePrompt] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState<
    Record<string, "up" | "down">
  >({});

  const {
    isOpen,
    conversationId,
    messages,
    isLoading,
    unreadCount,
    error,
    isEscalated,
    isAiHandled,
    isResolved,
    visitorEmail,
    context,
    toggleChat,
    closeChat,
    sendMessage,
    startConversation,
    loadConversation,
    clearChat,
    resolveAndClear,
    escalateConversation,
    setVisitorEmail,
    setContext,
    initFromStorage,
  } = useChatStore();

  // Initialize from localStorage on mount
  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  // Sync context prop to store
  useEffect(() => {
    if (contextProp) {
      setContext(contextProp);
    }
    return () => {
      if (contextProp) setContext(undefined);
    };
  }, [contextProp, setContext]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Poll for new messages when conversation is active and chat is open
  // Polls every 3s when escalated (waiting for agent), every 10s otherwise
  useEffect(() => {
    if (!conversationId || !isOpen || isResolved) return;

    const pollInterval = isEscalated ? 3000 : 10000;
    const interval = setInterval(() => {
      loadConversation();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [conversationId, isEscalated, isResolved, isOpen, loadConversation]);

  // Resume active conversation when chat opens (if conversationId exists but messages empty)
  useEffect(() => {
    if (isOpen && conversationId && messages.length === 0) {
      loadConversation();
    }
  }, [isOpen, conversationId, messages.length, loadConversation]);

  // Determine if user needs email prompt
  const handleOpenChat = useCallback(() => {
    toggleChat();
  }, [toggleChat]);

  const handleStartConversation = useCallback(
    (category: ConversationCategory, message: string) => {
      const isAuthenticated = authApi.isAuthenticated();

      // Anonymous user without email — prompt for email first
      if (!isAuthenticated && !visitorEmail) {
        setNeedsEmail(true);
        // Store the pending starter action
        pendingStarterRef.current = { category, message };
        return;
      }

      startConversation(category, message);
    },
    [visitorEmail, startConversation],
  );

  const pendingStarterRef = useRef<{
    category: ConversationCategory;
    message: string;
  } | null>(null);

  const handleEmailSubmit = useCallback(
    (email: string) => {
      setVisitorEmail(email);
      setNeedsEmail(false);

      // If there was a pending starter, execute it now
      if (pendingStarterRef.current) {
        const { category, message } = pendingStarterRef.current;
        pendingStarterRef.current = null;
        startConversation(category, message);
      }
    },
    [setVisitorEmail, startConversation],
  );

  const handleNewConversation = useCallback(() => {
    clearChat();
    setMessageFeedback({});
    setShowLeavePrompt(false);
  }, [clearChat]);

  const handleBackFromConversation = useCallback(() => {
    setShowLeavePrompt(true);
  }, []);

  const handleCloseAndNew = useCallback(() => {
    resolveAndClear();
    setMessageFeedback({});
    setShowLeavePrompt(false);
  }, [resolveAndClear]);

  const handleMessageFeedback = useCallback(
    (messageId: string, type: "up" | "down") => {
      setMessageFeedback((prev) => ({ ...prev, [messageId]: type }));
    },
    [],
  );

  const handleSatisfactionRate = useCallback(
    (_rating: "up" | "down") => {
      // Future: send to backend analytics
      // For now, just visual feedback
    },
    [],
  );

  // Get the email to show in the escalation notice
  const userEmail = visitorEmail || authApi.getStoredUser()?.email;

  // Determine what to show in the chat body
  const hasConversation = !!conversationId && messages.length > 0;
  const isConversationLoading = !!conversationId && messages.length === 0 && isLoading;

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-[110] w-96 max-h-[80vh] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
          <ChatHeader
            onClose={closeChat}
            onBack={
              showLeavePrompt
                ? () => setShowLeavePrompt(false)
                : hasConversation
                  ? handleBackFromConversation
                  : needsEmail
                  ? () => {
                      setNeedsEmail(false);
                      pendingStarterRef.current = null;
                    }
                  : undefined
            }
          />

          {/* Body */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto min-h-[200px] max-h-[55vh]"
          >
            {showLeavePrompt ? (
              <LeaveConversationPrompt
                onContinue={() => setShowLeavePrompt(false)}
                onCloseAndNew={handleCloseAndNew}
              />
            ) : needsEmail ? (
              <EmailPrompt onSubmit={handleEmailSubmit} />
            ) : isConversationLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-[#5E53E0] border-t-transparent rounded-full" />
              </div>
            ) : hasConversation ? (
              <div className="p-3">
                {messages.map((msg) => (
                  <ChatMessageBubble
                    key={msg.id}
                    message={msg}
                    feedbackGiven={messageFeedback}
                    onFeedback={handleMessageFeedback}
                  />
                ))}
                {isLoading && <TypingIndicator />}
                {error && (
                  <div className="text-center text-xs text-red-500 my-2">
                    {t("error")}
                  </div>
                )}
                {isEscalated && !isLoading && (
                  <div className="text-center my-3 space-y-1">
                    <p className="text-xs text-[#5E53E0] font-medium">
                      {t("escalation.waiting")}
                    </p>
                    {userEmail && (
                      <p className="text-[10px] text-gray-400">
                        {t("escalation.waitingEmail", { email: userEmail })}
                      </p>
                    )}
                  </div>
                )}
                {isResolved && (
                  <SatisfactionRating
                    onRate={handleSatisfactionRate}
                    onNewConversation={handleNewConversation}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <ConversationStarters
                context={context}
                onSelect={handleStartConversation}
              />
            )}
          </div>

          {/* Footer / Input area */}
          {hasConversation && !isResolved && !showLeavePrompt && (
            <ChatInput onSend={sendMessage} disabled={isLoading} />
          )}

          {/* Action buttons for active conversations */}
          {hasConversation && isAiHandled && !isResolved && !showLeavePrompt && (
            <div className="flex items-center justify-end px-3 py-2 border-t border-gray-50 bg-gray-50 rounded-b-lg">
              <button
                onClick={escalateConversation}
                className="text-xs text-gray-500 hover:text-[#5E53E0] transition-colors"
              >
                {t("escalate")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={handleOpenChat}
        className="fixed bottom-6 right-6 z-[110] w-14 h-14 rounded-full bg-[#87E64B] text-[#171717] shadow-lg hover:bg-[#78d43f] transition-all hover:scale-105 flex items-center justify-center"
        title={t("needHelp")}
      >
        {isOpen ? (
          <Xmark className="w-6 h-6" />
        ) : (
          <ChatBubble className="w-6 h-6" />
        )}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </>
  );
};

export default ChatWidget;
