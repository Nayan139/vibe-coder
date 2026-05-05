"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Loader2, Bot, User, X, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIThinkingSkeleton } from "@/components/LoadingSkeleton";
import { ModelSelector } from "@/components/ModelSelector";
import { NewChatButton } from "@/components/NewChatButton";
import { CommitPanel } from "@/components/CommitPanel";
import { type ModelOption } from "@/lib/models";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  changesSnapshot?: Record<string, string>;
}

interface AIChatProps {
  messages: ChatMessage[];
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  disabled?: boolean;
  // Phase 5: multi-select chips
  selectedFiles?: string[];
  onRemoveFile?: (path: string) => void;
  onClearAllFiles?: () => void;
  // Phase 5: model selector
  selectedModel?: ModelOption;
  onModelChange?: (model: ModelOption) => void;
  // Phase 5: new chat
  hasAccumulatedChanges?: boolean;
  onNewChat?: () => void;
  // Phase 5: commit panel
  accumulatedChanges?: Record<string, string>;
  baseBranch?: string;
  connectionId?: string;
  repoFullName?: string;
  lastPrompt?: string;
  sessionId?: string | null;
  onCommitSuccess?: (prUrl: string) => void;
  onDiscardAllChanges?: () => void;
}

export function AIChat({
  messages,
  prompt,
  onPromptChange,
  onSubmit,
  loading,
  disabled,
  selectedFiles,
  onRemoveFile,
  onClearAllFiles,
  selectedModel,
  onModelChange,
  hasAccumulatedChanges,
  onNewChat,
  accumulatedChanges,
  baseBranch,
  connectionId,
  repoFullName,
  lastPrompt,
  sessionId,
  onCommitSuccess,
  onDiscardAllChanges,
}: AIChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasChips = selectedFiles && selectedFiles.length > 0;
  const showCommitPanel =
    accumulatedChanges &&
    Object.keys(accumulatedChanges).length > 0 &&
    baseBranch &&
    connectionId &&
    repoFullName &&
    onCommitSuccess;
  const [confirmDiscardAll, setConfirmDiscardAll] = useState(false);

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
      {/* Chat header with New Chat button */}
      {onNewChat && (
        <div className="flex items-center justify-between px-4 pt-2 pb-1 shrink-0">
          <span className="text-xs text-gray-400">
            {messages.length > 0 ? `${messages.length} message${messages.length !== 1 ? "s" : ""}` : ""}
          </span>
          <NewChatButton
            hasChanges={hasAccumulatedChanges ?? false}
            onNewChat={onNewChat}
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-violet-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">AI Code Editor</h3>
            <p className="text-sm text-gray-400 max-w-xs">
              {selectedFiles !== undefined
                ? "Click files in the tree to add them as context chips, then describe what to change."
                : "Describe what you want to change in plain English. Click files in the tree to load them, then tell the AI what to modify."}
            </p>
            <div className="mt-6 space-y-2">
              {[
                "Change the hero title color to blue",
                "Add a loading spinner to the button",
                "Update the footer copyright year to 2026",
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
                {/* Per-message file change chips */}
                {msg.changesSnapshot && Object.keys(msg.changesSnapshot).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Object.keys(msg.changesSnapshot).map((path) => (
                      <span
                        key={path}
                        className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded"
                      >
                        {path.split("/").pop()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && <AIThinkingSkeleton />}
        <div ref={bottomRef} />
      </div>

      {/* Commit panel — shown when there are accumulated changes */}
      {showCommitPanel && (
        <div className="px-4 pb-1 shrink-0">
          {onDiscardAllChanges && (
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!confirmDiscardAll) {
                    setConfirmDiscardAll(true);
                    setTimeout(() => setConfirmDiscardAll(false), 3000);
                    return;
                  }
                  onDiscardAllChanges();
                  setConfirmDiscardAll(false);
                }}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                  confirmDiscardAll
                    ? "border-red-300 text-red-600 bg-red-50"
                    : "border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200"
                }`}
              >
                {confirmDiscardAll ? "Confirm discard all" : "Discard all changes"}
              </button>
            </div>
          )}
          <CommitPanel
            accumulatedChanges={accumulatedChanges!}
            baseBranch={baseBranch!}
            connectionId={connectionId!}
            repoFullName={repoFullName!}
            lastPrompt={lastPrompt ?? ""}
            sessionId={sessionId}
            onSuccess={onCommitSuccess!}
          />
        </div>
      )}

      {/* Prompt input area */}
      <div className="border-t border-gray-100 px-4 py-3 shrink-0">
        {/* File chips row */}
        {selectedFiles !== undefined && (
          <div className="mb-2">
            {hasChips ? (
              <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-gray-100">
                <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                {selectedFiles.map((path) => (
                  <span
                    key={path}
                    className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2 py-0.5 rounded-full"
                  >
                    {path.split("/").pop()}
                    {onRemoveFile && (
                      <button
                        onClick={() => onRemoveFile(path)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </span>
                ))}
                {onClearAllFiles && (
                  <button
                    onClick={onClearAllFiles}
                    className="text-xs text-gray-400 hover:text-red-400 transition-colors ml-1"
                  >
                    Clear all
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 pb-1.5 border-b border-gray-100">
                No files selected — AI will review the entire project
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => {
              onPromptChange(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to change… (Enter to send)"
            disabled={loading || disabled}
            rows={1}
            className="flex-1 resize-none px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50 min-h-[40px] max-h-40"
          />
          <div className="flex flex-col gap-1 shrink-0">
            {selectedModel && onModelChange && (
              <ModelSelector selected={selectedModel} onChange={onModelChange} />
            )}
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={loading || disabled || !prompt.trim()}
              className="bg-violet-600 hover:bg-violet-700 text-white h-10 w-10 p-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          {disabled
            ? "Load files from the tree first to give AI context."
            : "Shift+Enter for new line"}
        </p>
      </div>
    </div>
  );
}
