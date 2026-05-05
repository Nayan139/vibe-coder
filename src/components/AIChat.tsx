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
  readonly messages: ChatMessage[];
  readonly prompt: string;
  readonly onPromptChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly loading: boolean;
  readonly disabled?: boolean;
  readonly selectedFiles?: string[];
  readonly onRemoveFile?: (path: string) => void;
  readonly onClearAllFiles?: () => void;
  readonly selectedModel?: ModelOption;
  readonly onModelChange?: (model: ModelOption) => void;
  readonly hasAccumulatedChanges?: boolean;
  readonly onNewChat?: () => void;
  readonly accumulatedChanges?: Record<string, string>;
  readonly baseBranch?: string;
  readonly connectionId?: string;
  readonly repoFullName?: string;
  readonly lastPrompt?: string;
  readonly sessionId?: string | null;
  readonly onCommitSuccess?: (prUrl: string) => void;
  readonly onDiscardAllChanges?: () => void;
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

  function messageCount() {
    if (messages.length === 0) return "";
    return `${messages.length} message${messages.length === 1 ? "" : "s"}`;
  }

  function emptyStateSubtext() {
    if (selectedFiles !== undefined) {
      return "Click files in the tree to add them as context chips, then describe what to change.";
    }
    return "Describe what you want to change in plain English. Click files in the tree to load them, then tell the AI what to modify.";
  }

  return (
    <div className="flex flex-col h-full">
      {onNewChat && (
        <div className="flex items-center justify-between px-4 pt-2 pb-1 shrink-0">
          <span className="text-xs text-slate-400">{messageCount()}</span>
          <NewChatButton
            hasChanges={hasAccumulatedChanges ?? false}
            onNewChat={onNewChat}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-rose-500 to-amber-400 shadow-sm shadow-rose-200 mb-4">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">AI Code Editor</h3>
            <p className="text-sm text-slate-400 max-w-xs">{emptyStateSubtext()}</p>
            <div className="mt-6 space-y-2">
              {[
                "Change the hero title color to blue",
                "Add a loading spinner to the button",
                "Update the footer copyright year to 2026",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => onPromptChange(example)}
                  className="block w-full text-left text-xs bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 px-3 py-2 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  &quot;{example}&quot;
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.content.slice(0, 40) + msg.role} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-50 mt-0.5">
                  <Bot className="h-4 w-4 text-rose-500" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-linear-to-r from-rose-500 to-amber-400 text-white rounded-br-sm"
                    : "bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
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
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 mt-0.5">
                  <User className="h-4 w-4 text-slate-500" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && <AIThinkingSkeleton />}
        <div ref={bottomRef} />
      </div>

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
                className={`cursor-pointer text-xs px-2.5 py-1 rounded-md border transition-colors ${
                  confirmDiscardAll
                    ? "border-red-300 text-red-600 bg-red-50"
                    : "border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-500"
                }`}
              >
                {confirmDiscardAll ? "Confirm discard all" : "Discard all changes"}
              </button>
            </div>
          )}
          <CommitPanel
            accumulatedChanges={accumulatedChanges}
            baseBranch={baseBranch}
            connectionId={connectionId}
            repoFullName={repoFullName}
            lastPrompt={lastPrompt ?? ""}
            sessionId={sessionId}
            onSuccess={onCommitSuccess}
          />
        </div>
      )}

      <div className="border-t border-slate-100 px-4 py-3 shrink-0">
        {selectedFiles !== undefined && (
          <div className="mb-2">
            {hasChips ? (
              <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100">
                <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {selectedFiles.map((path) => (
                  <span
                    key={path}
                    className="flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-600 text-xs px-2 py-0.5 rounded-full"
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
                    className="cursor-pointer text-xs text-slate-400 hover:text-red-400 transition-colors ml-1"
                  >
                    Clear all
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 pb-1.5 border-b border-slate-100">
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
            className="flex-1 resize-none px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-300 disabled:opacity-50 disabled:bg-slate-50 min-h-10 max-h-40"
          />
          <div className="flex flex-col gap-1 shrink-0">
            {selectedModel && onModelChange && (
              <ModelSelector selected={selectedModel} onChange={onModelChange} />
            )}
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={loading || disabled || !prompt.trim()}
              className="bg-linear-to-r from-rose-500 to-amber-400 hover:opacity-90 text-white h-10 w-10 p-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          {disabled
            ? "Load files from the tree first to give AI context."
            : "Shift+Enter for new line"}
        </p>
      </div>
    </div>
  );
}
