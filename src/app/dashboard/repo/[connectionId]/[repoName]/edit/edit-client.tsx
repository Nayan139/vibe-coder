"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, GitBranch, Loader2, FolderGit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileTree } from "@/components/FileTree";
import { AIChat, type ChatMessage } from "@/components/AIChat";
import { DiffViewer } from "@/components/DiffViewer";
import { LivePreview } from "@/components/LivePreview";
import { StepProgress } from "@/components/StepProgress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_MODEL, MODEL_OPTIONS, type ModelOption } from "@/lib/models";

interface EditClientProps {
  connectionId: string;
  repoFullName: string;
  branch: string;
  provider: string;
  installCommand?: string;
  startCommand?: string;
  projectId?: string;
  initialSessionId?: string | null;
  initialMessages?: ChatMessage[];
  initialAccumulatedChanges?: Record<string, string>;
  initialLastPrompt?: string;
  initialLlmProvider?: string | null;
  initialLlmModel?: string | null;
}

type Step = "edit" | "review" | "done";

export function EditClient({
  connectionId,
  repoFullName,
  branch,
  provider,
  installCommand: _installCommand = "npm install",
  startCommand: _startCommand = "npm run dev",
  projectId,
  initialSessionId = null,
  initialMessages = [],
  initialAccumulatedChanges = {},
  initialLastPrompt = "",
  initialLlmProvider = null,
  initialLlmModel = null,
}: Readonly<EditClientProps>) {
  const router = useRouter();
  const repoName = repoFullName.split("/").pop() ?? repoFullName;

  // ── File state ────────────────────────────────────────────────────────────
  // Multi-select: files toggled as chips above the prompt
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  // All loaded file contents (updated with accumulated changes after apply)
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  // Baseline = original GitHub content (never overwritten once set)
  const [baselineFiles, setBaselineFiles] = useState<Record<string, string>>({});
  const [loadingFile, setLoadingFile] = useState(false);

  // ── AI / chat state ───────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [prompt, setPrompt] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);
  const initialModelSelection =
    MODEL_OPTIONS.find(
      (opt) =>
        (initialLlmModel ? opt.model === initialLlmModel : false) &&
        (initialLlmProvider ? opt.provider === initialLlmProvider : true)
    ) ?? DEFAULT_MODEL;
  const [selectedModel, setSelectedModel] = useState<ModelOption>(initialModelSelection);

  // ── Changes state ─────────────────────────────────────────────────────────
  // latestChanges = what the most recent AI prompt returned (shown in diff during review)
  const [latestChanges, setLatestChanges] = useState<Record<string, string>>({});
  // accumulatedChanges = all approved changes merged across all prompts in this session
  const [accumulatedChanges, setAccumulatedChanges] = useState<Record<string, string>>(
    initialAccumulatedChanges
  );
  const [lastPrompt, setLastPrompt] = useState(initialLastPrompt);
  const [step, setStep] = useState<Step>("edit");
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [repoTreePaths, setRepoTreePaths] = useState<string[]>([]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const loadedFiles = new Set(Object.keys(fileContents));
  const stepNumber = step === "edit" ? 4 : step === "review" ? 5 : 6;
  const hasAccumulatedChanges = Object.keys(accumulatedChanges).length > 0;

  // ── File loading ──────────────────────────────────────────────────────────
  const loadFile = useCallback(
    async (path: string) => {
      if (fileContents[path] !== undefined) return;
      setLoadingFile(true);
      try {
        const res = await fetch("/api/git/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId, repo: repoFullName, branch, filePath: path }),
        });
        if (!res.ok) {
          const err = await res.json() as { error?: string };
          toast.error(err.error ?? "Failed to load file");
          return;
        }
        const { content } = await res.json() as { content?: string };
        setFileContents((prev) => ({ ...prev, [path]: content ?? "" }));
        // Snapshot original content into baseline (only once)
        setBaselineFiles((prev) => {
          if (prev[path] !== undefined) return prev;
          return { ...prev, [path]: content ?? "" };
        });
      } catch {
        toast.error("Network error while loading file.");
      } finally {
        setLoadingFile(false);
      }
    },
    [connectionId, repoFullName, branch, fileContents]
  );

  // ── Multi-select toggle ───────────────────────────────────────────────────
  async function handleToggleFile(path: string) {
    await loadFile(path);
    setSelectedFiles((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  }

  function handleRemoveFile(path: string) {
    setSelectedFiles((prev) => prev.filter((p) => p !== path));
  }

  function handleClearAllFiles() {
    setSelectedFiles([]);
  }

  // ── Context selection ────────────────────────────────────────────────────
  // When chips are selected → use exactly those files as context.
  // When no chips → fall back to keyword-based auto-selection from loaded files.
  function buildContext(userPrompt: string): Record<string, string> {
    if (selectedFiles.length > 0) {
      const ctx: Record<string, string> = {};
      for (const p of selectedFiles) {
        // Use accumulated version if available, otherwise original
        ctx[p] = accumulatedChanges[p] ?? fileContents[p] ?? "";
      }
      return ctx;
    }

    // Auto-selection from loaded files
    const keywords = userPrompt.toLowerCase().split(/\s+/);
    const alwaysInclude = ["package.json", "page.tsx", "layout.tsx", "index.tsx", "app.tsx"];

    const relevant = Object.entries(fileContents)
      .filter(([path]) => {
        if (alwaysInclude.some((f) => path.endsWith(f))) return true;
        return keywords.some((kw) => kw.length > 3 && path.toLowerCase().includes(kw));
      })
      .sort(([a], [b]) => {
        // Prioritise last selected file
        if (a === selectedFiles[selectedFiles.length - 1]) return -1;
        if (b === selectedFiles[selectedFiles.length - 1]) return 1;
        return 0;
      });

    let totalChars = 0;
    const selected: Record<string, string> = {};
    for (const [path, content] of relevant) {
      const currentContent = accumulatedChanges[path] ?? content;
      if (totalChars + currentContent.length > 16000) break;
      selected[path] = currentContent;
      totalChars += currentContent.length;
    }
    return selected;
  }

  // ── Send prompt ───────────────────────────────────────────────────────────
  async function handleSendPrompt() {
    if (!prompt.trim() || generatingAI) return;

    const userMessage = prompt.trim();
    setPrompt("");
    setLastPrompt(userMessage);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setGeneratingAI(true);

    try {
      let res: Response;

      if (selectedFiles.length > 0) {
        // ── Mode A: files selected as chips → explicit context ─────────────────
        const contextFiles = buildContext(userMessage);

        if (Object.keys(contextFiles).length === 0) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "The selected files have no content loaded yet. Click files in the file tree to load them, then try again.",
            },
          ]);
          return;
        }

        res = await fetch("/api/ai/modify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: userMessage,
            fileContents: contextFiles,
            projectContext: `Repo: ${repoFullName}, Branch: ${branch}`,
            sessionId: sessionId ?? undefined,
            projectId: projectId ?? undefined,
            selectedFiles,
            overrideProvider: selectedModel.provider,
            overrideModel: selectedModel.model,
          }),
        });
      } else {
        // ── Mode B: no chips → whole-project AI mode (server picks files) ──────
        res = await fetch("/api/ai/whole-project", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: userMessage,
            connectionId,
            repoFullName,
            branch,
            projectContext: `Repo: ${repoFullName}, Branch: ${branch}`,
            sessionId: sessionId ?? undefined,
            projectId: projectId ?? undefined,
            accumulatedChanges,
            overrideProvider: selectedModel.provider,
            overrideModel: selectedModel.model,
          }),
        });
      }

      const data = await res.json() as {
        success?: boolean;
        error?: string;
        changes?: Record<string, string>;
        sessionId?: string;
        fetchedFiles?: Record<string, string>;
        filesAnalyzed?: string[];
      };

      if (!res.ok || !data.success) {
        const errMsg = data.error ?? "AI modification failed. Please try again.";
        toast.error(errMsg);
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${errMsg}` }]);
        return;
      }

      if (typeof data.sessionId === "string") setSessionId(data.sessionId);

      const aiChanges = data.changes ?? {};
      const changedPaths = Object.keys(aiChanges);
      const fetchedFiles = data.fetchedFiles ?? {};

      // Whole-project mode: add fetched originals to fileContents so the tree
      // shows them as loaded and future prompts can use them as context.
      if (Object.keys(fetchedFiles).length > 0) {
        setFileContents((prev) => {
          const next = { ...prev };
          for (const [p, c] of Object.entries(fetchedFiles)) {
            if (next[p] === undefined) next[p] = c;
          }
          return next;
        });
      }

      // Snapshot baselines for any files we haven't seen before.
      // fetchedFiles supplies the original content for whole-project mode.
      setBaselineFiles((prev) => {
        const next = { ...prev };
        for (const path of changedPaths) {
          if (next[path] === undefined) {
            next[path] = fetchedFiles[path] ?? fileContents[path] ?? "";
          }
        }
        return next;
      });

      setLatestChanges(aiChanges);

      const analyzedCount = data.filesAnalyzed?.length ?? 0;
      const fileList = changedPaths.map((p) => `• ${p}`).join("\n");
      const changedLabel = changedPaths.length === 1 ? "1 file" : `${changedPaths.length} files`;
      let assistantContent: string;
      if (analyzedCount > 0) {
        const analyzedLabel = analyzedCount === 1 ? "1 file" : `${analyzedCount} files`;
        assistantContent = `Analyzed ${analyzedLabel} and modified ${changedLabel}:\n${fileList}\n\nReview the diff on the right, then click "Apply Changes".`;
      } else {
        assistantContent = `Done! Modified ${changedLabel}:\n${fileList}\n\nReview the diff on the right, then click "Apply Changes" to add them to your session.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantContent,
          changesSnapshot: aiChanges,
        },
      ]);

      setStep("review");
      toast.success("AI changes ready — review the diff!");
    } catch {
      const msg = "Network error. Please check your connection and try again.";
      toast.error(msg);
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setGeneratingAI(false);
    }
  }

  // ── Apply / Discard ───────────────────────────────────────────────────────
  function handleApplyChanges() {
    // Merge latest changes into fileContents (so AI has updated context next prompt)
    setFileContents((prev) => ({ ...prev, ...latestChanges }));
    // Merge into accumulated changes
    setAccumulatedChanges((prev) => ({ ...prev, ...latestChanges }));
    setLatestChanges({});
    setStep("edit");
    toast.success("Changes applied and accumulated. Keep prompting or commit when ready.");
  }

  function handleDiscardChanges() {
    setLatestChanges({});
    setStep("edit");
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "Changes discarded. Feel free to try a different prompt." },
    ]);
    toast.info("Changes discarded.");
  }

  function handleDiscardAllChanges() {
    setLatestChanges({});
    setAccumulatedChanges({});
    setStep("edit");
    toast.info("All accumulated changes were discarded.");
  }

  // ── New chat ──────────────────────────────────────────────────────────────
  async function createNewSession(): Promise<string | null> {
    if (!projectId) return null;
    try {
      const res = await fetch("/api/sessions/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) return null;
      const data = await res.json() as { success?: boolean; sessionId?: string };
      if (data.success && typeof data.sessionId === "string") return data.sessionId;
      return null;
    } catch {
      return null;
    }
  }

  async function handleNewChat() {
    setMessages([]);
    setLatestChanges({});
    setAccumulatedChanges({});
    setSelectedFiles([]);
    setLastPrompt("");
    setStep("edit");

    const freshSessionId = await createNewSession();
    setSessionId(freshSessionId);

    if (!freshSessionId && projectId) {
      toast.warning("Started new chat locally, but session creation failed. It will be created on next prompt.");
      return;
    }
    toast.info("Started a new chat session. File contents are still loaded.");
  }

  // ── Commit success ────────────────────────────────────────────────────────
  function handleCommitSuccess(prUrl: string) {
    setStep("done");
    toast.success("PR created! View it at: " + prUrl);
  }

  // ── Diff source ───────────────────────────────────────────────────────────
  // During review: show baseline vs latestChanges
  // Otherwise: show baseline vs accumulatedChanges (total delta so far)
  const diffOriginals =
    step === "review"
      ? Object.fromEntries(
          Object.keys(latestChanges).map((path) => [path, baselineFiles[path] ?? fileContents[path] ?? ""])
        )
      : Object.fromEntries(
          Object.keys(accumulatedChanges).map((path) => [path, baselineFiles[path] ?? ""])
        );

  const diffChanges = step === "review" ? latestChanges : accumulatedChanges;
  const previewBaseFiles = { ...fileContents, ...baselineFiles };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <header className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 border-b border-gray-200 bg-white shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            router.push(`/dashboard/repo/${connectionId}/${encodeURIComponent(repoFullName)}`)
          }
          className="gap-2 text-gray-500 h-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <div className="flex items-center gap-2 min-w-0">
          <FolderGit2 className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm font-medium text-gray-700 truncate">{repoName}</span>
          <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
            <GitBranch className="w-3 h-3" />
            <span>{branch}</span>
          </div>
          <Badge variant="secondary" className="text-xs capitalize shrink-0">
            {provider}
          </Badge>
        </div>

        {hasAccumulatedChanges && (
          <div className="flex items-center gap-1 text-xs text-green-600 font-medium shrink-0">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            {Object.keys(accumulatedChanges).length} file{Object.keys(accumulatedChanges).length !== 1 ? "s" : ""} accumulated
          </div>
        )}

        {loadingFile && (
          <Loader2 className="w-4 h-4 animate-spin text-violet-500 shrink-0" />
        )}

        <div className="w-full sm:w-auto sm:ml-auto flex justify-start sm:justify-end min-w-0 overflow-x-auto pb-0.5">
          <StepProgress currentStep={stepNumber} />
        </div>
      </header>

      {/* Three-panel editor */}
      <div className="flex flex-col xl:flex-row flex-1 min-h-0 overflow-hidden">
        {/* Left: File Tree */}
        <aside className="w-full xl:w-60 xl:shrink-0 border-b xl:border-b-0 xl:border-r border-gray-200 bg-white flex flex-col min-h-0 max-h-[34vh] xl:max-h-none overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-gray-100 shrink-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Files</p>
            <p className="text-xs text-gray-400 mt-0.5">Click to add as context</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <FileTree
              connectionId={connectionId}
              repoFullName={repoFullName}
              branch={branch}
              onToggleFile={handleToggleFile}
              selectedFiles={selectedFiles}
              loadedFiles={loadedFiles}
              onTreePathsChange={setRepoTreePaths}
            />
          </div>
        </aside>

        {/* Center: AI Chat */}
        <div className="flex-1 min-h-0 min-w-0 border-b xl:border-b-0 xl:border-r border-gray-200 bg-white flex flex-col overflow-hidden max-h-[50vh] xl:max-h-none">
          <div className="flex-1 overflow-hidden">
            <AIChat
              messages={messages}
              prompt={prompt}
              onPromptChange={setPrompt}
              onSubmit={handleSendPrompt}
              loading={generatingAI}
              disabled={step === "done"}
              // Phase 5: multi-select chips
              selectedFiles={selectedFiles}
              onRemoveFile={handleRemoveFile}
              onClearAllFiles={handleClearAllFiles}
              // Phase 5: model selector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              // Phase 5: new chat
              hasAccumulatedChanges={hasAccumulatedChanges}
              onNewChat={handleNewChat}
              // Phase 5: commit panel
              accumulatedChanges={accumulatedChanges}
              baseBranch={branch}
              connectionId={connectionId}
              repoFullName={repoFullName}
              lastPrompt={lastPrompt}
              sessionId={sessionId}
              onCommitSuccess={handleCommitSuccess}
              onDiscardAllChanges={handleDiscardAllChanges}
            />
          </div>
        </div>

        {/* Right: Diff Preview */}
        <div className="w-full xl:w-[45%] xl:max-w-[50%] xl:shrink-0 bg-white flex flex-col min-h-0 flex-1 overflow-hidden">
          <Tabs defaultValue="diff" className="flex h-full flex-col overflow-hidden">
            <div className="px-4 pt-3 pb-2 border-b border-gray-100 shrink-0 flex items-center justify-between">
              <TabsList variant="line">
                <TabsTrigger value="diff">Diff View</TabsTrigger>
                <TabsTrigger value="preview">Live Preview</TabsTrigger>
              </TabsList>
              {hasAccumulatedChanges && step !== "review" && (
                <span className="text-xs text-gray-400">
                  {Object.keys(accumulatedChanges).length} file{Object.keys(accumulatedChanges).length !== 1 ? "s" : ""} changed total
                </span>
              )}
            </div>

            <TabsContent value="diff" className="flex-1 min-h-0 overflow-hidden">
              <DiffViewer
                originalFiles={diffOriginals}
                changedFiles={diffChanges}
                onApply={step === "review" ? handleApplyChanges : undefined}
                onDiscard={step === "review" ? handleDiscardChanges : undefined}
                showActions={step === "review"}
              />
            </TabsContent>

            <TabsContent value="preview" className="flex-1 min-h-0 overflow-hidden p-3">
              <LivePreview
                allFiles={previewBaseFiles}
                changedFiles={accumulatedChanges}
                installCommand={_installCommand}
                startCommand={_startCommand}
                repoTreePaths={repoTreePaths}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
