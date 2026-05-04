"use client";

import { useRef, useEffect } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIChatProps {
  messages: ChatMessage[];
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  disabled?: boolean;
}

export function AIChat({ messages, prompt, onPromptChange, onSubmit, loading, disabled }: AIChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && !disabled && prompt.trim()) onSubmit();
    }
  }

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-violet-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">AI Code Editor</h3>
            <p className="text-sm text-gray-400 max-w-xs">
              Describe what you want to change in plain English. Click files in the tree to load them, then
              tell the AI what to modify.
            </p>
            <div className="mt-6 space-y-2">
              {[
                "Change the hero title color to blue",
                "Add a loading spinner to the button",
                "Update the footer copyright year to 2025",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => onPromptChange(example)}
                  className="block w-full text-left text-xs bg-gray-50 hover:bg-violet-50 hover:text-violet-700 text-gray-500 px-3 py-2 rounded-lg border border-gray-200 transition-colors"
                >
                  &quot;{example}&quot;
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-violet-600" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-violet-600 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-4 h-4 text-violet-600" />
            </div>
            <div className="bg-gray-100 px-3 py-2.5 rounded-xl rounded-bl-sm">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-4 py-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => {
              onPromptChange(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to change... (Enter to send)"
            disabled={loading || disabled}
            rows={1}
            className="flex-1 resize-none px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50 min-h-[40px] max-h-40"
          />
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={loading || disabled || !prompt.trim()}
            className="bg-violet-600 hover:bg-violet-700 text-white shrink-0 h-10 w-10 p-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          {disabled ? "Load files from the tree first to give AI context." : "Shift+Enter for new line"}
        </p>
      </div>
    </div>
  );
}
