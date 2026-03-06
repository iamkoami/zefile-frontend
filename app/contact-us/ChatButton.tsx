"use client";

import { useChatStore } from "@/stores/chat-store";

interface ChatButtonProps {
  label: string;
}

export default function ChatButton({ label }: ChatButtonProps) {
  const { openChat } = useChatStore();

  return (
    <button
      onClick={openChat}
      className="text-sm font-medium text-[#171717] underline underline-offset-2 hover:text-[#171717] transition-colors"
    >
      {label}
    </button>
  );
}
