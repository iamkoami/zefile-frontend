"use client";

import React, { useCallback } from "react";

interface ChatButtonProps {
  label: string;
}

export default function ChatButton({ label }: ChatButtonProps) {
  const handleClick = useCallback(async () => {
    const { useChatStore } = await import("@/stores/chat-store");
    useChatStore.getState().openChat();
  }, []);

  return (
    <button
      onClick={handleClick}
      className="text-sm font-medium text-[#171717] underline underline-offset-2 hover:text-[#171717] transition-colors"
    >
      {label}
    </button>
  );
}
