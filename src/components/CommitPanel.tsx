"use client";

import { useState } from "react";
import { GitPullRequest, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface CommitPanelProps {
  accumulatedChanges: Record<string, string>;
  baseBranch: string;
  connectionId: string;
  repoFullName: string;
  lastPrompt: string;
  sessionId?: string | null;
  onSuccess: (prUrl: string) => void;
}

type CommitStatus = "idle" | "commitmsg" | "pushing" | "pr" | "done";

export function CommitPanel({
  accumulatedChanges,
  baseBranch,
  connectionId,
  repoFullName,
  lastPrompt,
  sessionId,
  onSuccess,
}: CommitPanelProps) {
  const [branchName, setBranchName] = useState(() => `ai-changes-${Date.now()}`);
  const [status, setStatus] = useState<CommitStatus>("idle");
  const [prUrl, setPrUrl] = useState("");

  const hasChanges = Object.keys(accumulatedChanges).length > 0;
  if (!hasChanges) return null;

  const changedPaths = Object.keys(accumulatedChanges);

  async function handleCommit() {
    if (!branchName.trim()) {
      toast.error("Branch name cannot be empty.");
      return;
    }

    // Step 1: commit message
    setStatus("commitmsg");
    let commitMessage = `feat: AI-powered changes — ${lastPrompt.slice(0, 50)}`;
    try {
      const cmRes = await fetch("/api/ai/commit-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: accumulatedChanges, userPrompt: lastPrompt || "AI edits" }),
      });
      if (cmRes.ok) {
        const cmData = await cmRes.json() as { message?: string };
        if (typeof cmData.message === "string") commitMessage = cmData.message;
      }
    } catch {
      // use fallback
    }

    // Step 2: push
    setStatus("pushing");
    try {
      const pushRes = await fetch("/api/git/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId,
          repoFullName,
          baseBranch,
          newBranch: branchName.trim(),
          changes: accumulatedChanges,
          commitMessage,
          ...(sessionId ? { sessionId } : {}),
        }),
      });
      const pushData = await pushRes.json() as { success?: boolean; error?: string };
      if (!pushRes.ok || !pushData.success) {
        toast.error(pushData.error ?? "Push failed.");
        setStatus("idle");
        return;
      }
      toast.success(`Branch "${branchName}" pushed!`);
    } catch {
      toast.error("Network error during push.");
      setStatus("idle");
      return;
    }

    // Step 3: create PR
    setStatus("pr");
    try {
      const prRes = await fetch("/api/git/create-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId,
          repoFullName,
          baseBranch,
          newBranch: branchName.trim(),
          changes: accumulatedChanges,
          userPrompt: lastPrompt || "AI-powered changes",
          ...(sessionId ? { sessionId } : {}),
        }),
      });
      const prData = await prRes.json() as { success?: boolean; prUrl?: string; error?: string };
      if (!prRes.ok || !prData.success) {
        toast.error(prData.error ?? "PR creation failed.");
        setStatus("idle");
        return;
      }
      const url = prData.prUrl ?? "";
      setPrUrl(url);
      setStatus("done");
      toast.success("Pull Request created!");
      onSuccess(url);
    } catch {
      toast.error("Network error during PR creation.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-green-700 font-semibold mb-2 flex items-center gap-2">
          <GitPullRequest className="w-4 h-4" /> PR Created!
        </p>
        <a
          href={prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-blue-600 text-sm underline"
        >
          View Pull Request <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  const isWorking = status !== "idle";

  return (
    <div className="border-t pt-3 mt-2 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">Ready to commit?</p>
        <span className="text-xs text-gray-400">{changedPaths.length} file{changedPaths.length !== 1 ? "s" : ""} changed</span>
      </div>

      {/* Changed files summary */}
      <div className="flex flex-wrap gap-1">
        {changedPaths.map((path) => (
          <span
            key={path}
            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
          >
            {path.split("/").pop()}
          </span>
        ))}
      </div>

      {/* Branch name */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Branch name</label>
        <input
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
          disabled={isWorking}
          className="w-full border rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50"
        />
      </div>

      <button
        onClick={handleCommit}
        disabled={isWorking}
        className="w-full bg-green-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isWorking ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {status === "commitmsg" && "Generating commit message…"}
            {status === "pushing" && "Pushing changes…"}
            {status === "pr" && "Creating PR…"}
          </>
        ) : (
          <>
            <GitPullRequest className="w-4 h-4" />
            Commit & Raise PR
          </>
        )}
      </button>
    </div>
  );
}
