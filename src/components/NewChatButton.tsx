"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";

interface NewChatButtonProps {
  hasChanges: boolean;
  onNewChat: () => void;
}

export function NewChatButton({ hasChanges, onNewChat }: NewChatButtonProps) {
  const [confirming, setConfirming] = useState(false);

  function handleClick() {
    if (!hasChanges) {
      onNewChat();
      return;
    }
    if (confirming) {
      onNewChat();
      setConfirming(false);
      return;
    }
    setConfirming(true);
    setTimeout(() => setConfirming(false), 3000);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
        confirming
          ? "border-red-300 text-red-500 bg-red-50"
          : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <MessageSquarePlus className="w-3.5 h-3.5" />
      {confirming ? "Confirm — changes will be lost" : "New Chat"}
    </button>
  );
}
