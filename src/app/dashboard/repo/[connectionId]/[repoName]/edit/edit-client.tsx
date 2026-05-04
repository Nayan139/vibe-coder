"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  GitBranch,
  Loader2,
  GitPullRequest,
  X,
  FolderGit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileTree } from "@/components/FileTree";
import { AIChat, type ChatMessage } from "@/components/AIChat";
import { DiffViewer } from "@/components/DiffViewer";
import { PRResultCard } from "@/components/PRResultCard";
import { StepProgress } from "@/components/StepProgress";
import { Badge } from "@/components/ui/badge";

interface EditClientProps {
  connectionId: string;
  repoFullName: string;
  branch: string;
  provider: string;
  userId: string;
}

type Step = "edit" | "review" | "push" | "done";

interface PRResult {
  prUrl: string;
  prTitle: string;
  prNumber: number;
}

export function EditClient({ connectionId, repoFullName, branch, provider, userId }: EditClientProps) {
  const router = useRouter();
  const repoName = repoFullName.split("/").pop() ?? repoFullName;

  // File state
  const [selectedFile, setSelectedFile] = useState<string | undefined>();
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [loadingFile, setLoadingFile] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);

  // Changes state
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [step, setStep] = useState<Step>("edit");
  const [lastPrompt, setLastPrompt] = useState("");

  // Push / PR state
  const [branchName, setBranchName] = useState(`ai-changes-${Date.now()}`);
  const [pushing, setPushing] = useState(false);
  const [creatingPR, setCreatingPR] = useState(false);
  const [pushedBranch, setPushedBranch] = useState<string | null>(null);
  const [prResult, setPRResult] = useState<PRResult | null>(null);

  const loadedFiles = new Set(Object.keys(fileContents));
  const stepNumber = step === "edit" ? 4 : step === "review" ? 5 : 6;

  const handleFileSelect = useCallback(
    async (path: string) => {
      setSelectedFile(path);
      if (fileContents[path] !== undefined) return;

      setLoadingFile(true);
      try {
        const res = await fetch("/api/git/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId, repo: repoFullName, branch, filePath: path }),
        });

        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error ?? "Failed to load file");
          return;
        }

        const { content } = await res.json();
        setFileContents((prev) => ({ ...prev, [path]: content ?? "" }));
      } catch {
        toast.error("Network error while loading file.");
      } finally {
        setLoadingFile(false);
      }
    },
    [connectionId, repoFullName, branch, fileContents]
  );

  function selectRelevantFiles(userPrompt: string): Record<string, string> {
    const keywords = userPrompt.toLowerCase().split(/\s+/);
    const alwaysInclude = ["package.json", "page.tsx", "layout.tsx", "index.tsx", "app.tsx"];

    const relevant = Object.entries(fileContents)
      .filter(([path]) => {
        if (alwaysInclude.some((f) => path.endsWith(f))) return true;
        return keywords.some((kw) => kw.length > 3 && path.toLowerCase().includes(kw));
      })
      .sort(([a], [b]) => {
        // Prioritise recently selected file
        if (selectedFile && a === selectedFile) return -1;
        if (selectedFile && b === selectedFile) return 1;
        return 0;
      });

    // Cap at ~16 000 chars of total context
    let totalChars = 0;
    const selected: Record<string, string> = {};
    for (const [path, content] of relevant) {
      if (totalChars + content.length > 16000) break;
      selected[path] = content;
      totalChars += content.length;
    }

    // Always include the currently-selected file if it fits
    if (selectedFile && fileContents[selectedFile] && !selected[selectedFile]) {
      selected[selectedFile] = fileContents[selectedFile];
    }

    return selected;
  }

  async function handleSendPrompt() {
    if (!prompt.trim() || generatingAI) return;

    const userMessage = prompt.trim();
    setPrompt("");
    setLastPrompt(userMessage);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setGeneratingAI(true);

    const relevantFiles = selectRelevantFiles(userMessage);

    if (Object.keys(relevantFiles).length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I don't have any file content loaded yet. Please click on some files in the file tree on the left, then try again.",
        },
      ]);
      setGeneratingAI(false);
      return;
    }

    try {
      const res = await fetch("/api/ai/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage,
          fileContents: relevantFiles,
          projectContext: `Repo: ${repoFullName}, Branch: ${branch}`,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errMsg = data.error ?? "AI modification failed. Please try again.";
        toast.error(errMsg);
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${errMsg}` }]);
        return;
      }

      const aiChanges: Record<string, string> = data.changes;
      const changedPaths = Object.keys(aiChanges);

      setChanges(aiChanges);
      // Store originals for diff view
      const originals: Record<string, string> = {};
      for (const path of changedPaths) {
        originals[path] = fileContents[path] ?? "";
      }
      setFileContents((prev) => ({ ...prev, ...originals }));

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Done! I've modified ${changedPaths.length} file${changedPaths.length !== 1 ? "s" : ""}:\n${changedPaths.map((p) => `• ${p}`).join("\n")}\n\nCheck the diff preview on the right and click "Apply Changes" to proceed.`,
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

  function handleApplyChanges() {
    // Merge AI changes into fileContents
    setFileContents((prev) => ({ ...prev, ...changes }));
    setStep("push");
    toast.success("Changes applied! Set a branch name and push.");
  }

  function handleDiscardChanges() {
    setChanges({});
    setStep("edit");
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "Changes discarded. Feel free to try a different prompt." },
    ]);
    toast.info("Changes discarded.");
  }

  async function handlePushAndCreatePR() {
    if (!branchName.trim()) {
      toast.error("Branch name cannot be empty.");
      return;
    }

    // Step 1: Generate commit message
    setPushing(true);
    let commitMessage = `feat: AI-powered changes — ${lastPrompt.slice(0, 50)}`;
    try {
      const cmRes = await fetch("/api/ai/commit-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes, userPrompt: lastPrompt }),
      });
      if (cmRes.ok) {
        const cmData = await cmRes.json();
        commitMessage = cmData.message || commitMessage;
      }
    } catch {
      // Use fallback commit message
    }

    // Step 2: Push to branch
    try {
      const pushRes = await fetch("/api/git/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId,
          repoFullName,
          baseBranch: branch,
          newBranch: branchName.trim(),
          changes,
          commitMessage,
        }),
      });

      const pushData = await pushRes.json();

      if (!pushRes.ok || !pushData.success) {
        toast.error(pushData.error ?? "Push failed. Please try again.");
        setPushing(false);
        return;
      }

      setPushedBranch(pushData.branch);
      toast.success(`Branch "${pushData.branch}" created and pushed!`);
    } catch {
      toast.error("Network error during push.");
      setPushing(false);
      return;
    }

    setPushing(false);

    // Step 3: Create PR
    setCreatingPR(true);
    try {
      const prRes = await fetch("/api/git/create-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId,
          repoFullName,
          baseBranch: branch,
          newBranch: branchName.trim(),
          changes,
          userPrompt: lastPrompt,
        }),
      });

      const prData = await prRes.json();

      if (!prRes.ok || !prData.success) {
        toast.error(prData.error ?? "PR creation failed.");
        setCreatingPR(false);
        return;
      }

      setPRResult({ prUrl: prData.prUrl, prTitle: prData.prTitle, prNumber: prData.prNumber });
      setStep("done");
      toast.success("Pull Request created!");
    } catch {
      toast.error("Network error during PR creation.");
    } finally {
      setCreatingPR(false);
    }
  }

  function handleStartNew() {
    setChanges({});
    setMessages([]);
    setStep("edit");
    setPRResult(null);
    setPushedBranch(null);
    setBranchName(`ai-changes-${Date.now()}`);
    setLastPrompt("");
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white shrink-0">
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

        <div className="ml-auto">
          <StepProgress currentStep={stepNumber} />
        </div>
      </header>

      {/* Push / PR Banner */}
      {step === "push" && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <GitPullRequest className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-sm font-medium text-amber-800">Ready to push!</span>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs text-amber-700 shrink-0">Branch name:</span>
              <Input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="h-7 text-xs font-mono max-w-xs bg-white border-amber-300"
                placeholder="ai-changes-..."
              />
            </div>
            <Button
              size="sm"
              onClick={handlePushAndCreatePR}
              disabled={pushing || creatingPR}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shrink-0"
            >
              {pushing || creatingPR ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {pushing ? "Pushing..." : "Creating PR..."}
                </>
              ) : (
                <>
                  <GitPullRequest className="w-3.5 h-3.5" />
                  Create Branch & PR
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("review")}
              disabled={pushing || creatingPR}
              className="h-7 w-7 p-0 text-amber-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* PR Done Banner */}
      {step === "done" && prResult && (
        <div className="px-5 py-4 bg-green-50 border-b border-green-200 shrink-0">
          <PRResultCard
            prUrl={prResult.prUrl}
            prTitle={prResult.prTitle}
            prNumber={prResult.prNumber}
            newBranch={pushedBranch ?? branchName}
            baseBranch={branch}
            onStartNew={handleStartNew}
          />
        </div>
      )}

      {/* Three-panel editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: File Tree */}
        <aside className="w-60 shrink-0 border-r border-gray-200 bg-white overflow-y-auto flex flex-col">
          <div className="px-3 pt-3 pb-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Files
            </p>
            {loadingFile && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-violet-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading...
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <FileTree
              connectionId={connectionId}
              repoFullName={repoFullName}
              branch={branch}
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              loadedFiles={loadedFiles}
            />
          </div>
        </aside>

        {/* Center: AI Chat */}
        <div className="flex-1 min-w-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-gray-100 shrink-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Chat</p>
            {Object.keys(fileContents).length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {Object.keys(fileContents).length} file{Object.keys(fileContents).length !== 1 ? "s" : ""} loaded as context
              </p>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <AIChat
              messages={messages}
              prompt={prompt}
              onPromptChange={setPrompt}
              onSubmit={handleSendPrompt}
              loading={generatingAI}
              disabled={step === "done"}
            />
          </div>
        </div>

        {/* Right: Diff Preview */}
        <div className="w-[45%] shrink-0 bg-white flex flex-col overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-gray-100 shrink-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Diff Preview</p>
          </div>
          <div className="flex-1 overflow-hidden">
            <DiffViewer
              originalFiles={Object.fromEntries(
                Object.keys(changes).map((path) => [path, fileContents[path] ?? ""])
              )}
              changedFiles={changes}
              onApply={handleApplyChanges}
              onDiscard={handleDiscardChanges}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
