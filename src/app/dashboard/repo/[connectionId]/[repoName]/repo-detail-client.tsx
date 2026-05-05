"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, GitBranch, Package, Play, Loader2, ChevronDown, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StepProgress } from "@/components/StepProgress";
import { RunCommandsCard } from "@/components/RunCommandsCard";
import { BranchSelectorSkeleton } from "@/components/LoadingSkeleton";

interface SetupInfo {
  install: string;
  start: string;
  notes: string;
}

interface RepoDetailClientProps {
  connectionId: string;
  repoFullName: string;
  provider: string;
  username: string;
}

export function RepoDetailClient({ connectionId, repoFullName, provider, username }: RepoDetailClientProps) {
  const router = useRouter();
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingReadme, setLoadingReadme] = useState(false);
  const [setupInfo, setSetupInfo] = useState<SetupInfo | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Track user-overridable commands separately from the AI-parsed defaults
  const [installCmd, setInstallCmd] = useState("npm install");
  const [startCmd, setStartCmd] = useState("npm run dev");

  const repoName = repoFullName.split("/").pop() ?? repoFullName;

  const loadReadmeForBranch = useCallback(
    async (branch: string) => {
      if (!branch) return;
      setLoadingReadme(true);
      setSetupInfo(null);
      try {
        const fileRes = await fetch("/api/git/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionId,
            repo: repoFullName,
            branch,
            filePath: "README.md",
          }),
        });

        if (!fileRes.ok) {
          const errBody = await fileRes.json().catch(() => ({})) as { error?: string };
          toast.info(errBody.error ?? "README not available — using default setup hints.");
          const defaults = { install: "npm install", start: "npm run dev", notes: "No README found." };
          setSetupInfo(defaults);
          setInstallCmd(defaults.install);
          setStartCmd(defaults.start);
          return;
        }

        const fileJson = await fileRes.json().catch(() => ({})) as { content?: string; exists?: boolean };
        const content = typeof fileJson.content === "string" ? fileJson.content : "";
        const exists = fileJson.exists !== false;

        if (!exists || !content) {
          const defaults = { install: "npm install", start: "npm run dev", notes: "No README found." };
          setSetupInfo(defaults);
          setInstallCmd(defaults.install);
          setStartCmd(defaults.start);
          return;
        }

        const parseRes = await fetch("/api/ai/parse-readme", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ readmeContent: content }),
        });

        if (!parseRes.ok) {
          const errBody = await parseRes.json().catch(() => ({})) as { error?: string };
          toast.error(errBody.error ?? "Could not parse README with AI.");
          const defaults = { install: "npm install", start: "npm run dev", notes: "Could not parse README." };
          setSetupInfo(defaults);
          setInstallCmd(defaults.install);
          setStartCmd(defaults.start);
          return;
        }

        const parsed = await parseRes.json().catch(() => null) as Record<string, string> | null;
        if (!parsed || typeof parsed !== "object") {
          const defaults = { install: "npm install", start: "npm run dev", notes: "Invalid parse response." };
          setSetupInfo(defaults);
          setInstallCmd(defaults.install);
          setStartCmd(defaults.start);
          return;
        }

        const info = {
          install: typeof parsed.install === "string" ? parsed.install : "npm install",
          start: typeof parsed.start === "string" ? parsed.start : "npm run dev",
          notes: typeof parsed.notes === "string" ? parsed.notes : "",
        };
        setSetupInfo(info);
        setInstallCmd(info.install);
        setStartCmd(info.start);
      } catch {
        toast.error("Failed to fetch or parse README.");
        const defaults = { install: "npm install", start: "npm run dev", notes: "" };
        setSetupInfo(defaults);
        setInstallCmd(defaults.install);
        setStartCmd(defaults.start);
      } finally {
        setLoadingReadme(false);
      }
    },
    [connectionId, repoFullName]
  );

  useEffect(() => {
    async function fetchBranches() {
      setLoadingBranches(true);
      setSetupInfo(null);
      try {
        const res = await fetch(
          `/api/git/branches?connectionId=${connectionId}&repo=${encodeURIComponent(repoFullName)}`
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { error?: string };
          toast.error(typeof err.error === "string" ? err.error : "Failed to load branches.");
          setBranches([]);
          return;
        }
        const data: string[] = await res.json();
        setBranches(data);
        if (data.length === 0) {
          toast.info("This repository has no branches, or you may lack access.");
          setSelectedBranch("");
          return;
        }
        const defaultBranch =
          data.find((b) => b === "main") ?? data.find((b) => b === "master") ?? data[0] ?? "";
        setSelectedBranch(defaultBranch);
        if (defaultBranch) {
          await loadReadmeForBranch(defaultBranch);
        }
      } catch {
        toast.error("Network error while loading branches.");
        setBranches([]);
      } finally {
        setLoadingBranches(false);
      }
    }
    fetchBranches();
  }, [connectionId, repoFullName, loadReadmeForBranch]);

  async function handleBranchSelect(branch: string) {
    setSelectedBranch(branch);
    setDropdownOpen(false);
    await loadReadmeForBranch(branch);
  }

  function handleStartEditing() {
    if (!selectedBranch) {
      toast.error("Please select a branch first.");
      return;
    }
    const params = new URLSearchParams({
      branch: selectedBranch,
      install: installCmd,
      start: startCmd,
    });
    router.push(
      `/dashboard/repo/${connectionId}/${encodeURIComponent(repoFullName)}/edit?${params.toString()}`
    );
  }

  return (
    <div className="px-4 sm:px-6 md:px-8 py-8 md:py-10 max-w-3xl mx-auto">
      <StepProgress currentStep={3} />

      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="gap-2 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
          Repositories
        </Button>
      </div>

      <div className="flex items-start gap-4 mb-6 md:mb-8">
        <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
          <Code2 className="w-6 h-6 text-violet-600" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{repoName}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs capitalize">
              {provider}
            </Badge>
            <span className="text-sm text-gray-500">{username}</span>
            <span className="text-gray-300 hidden sm:inline">·</span>
            <span className="text-sm text-gray-500 font-mono truncate max-w-full sm:max-w-md block sm:inline">
              {repoFullName}
            </span>
          </div>
        </div>
      </div>

      {/* Branch selector */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-violet-600" />
            Select Branch
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingBranches ? (
            <BranchSelectorSkeleton />
          ) : branches.length === 0 ? (
            <div className="text-sm text-gray-500 py-2">
              <p className="font-medium text-gray-700">No branches available</p>
              <p className="mt-1 text-xs text-gray-400">
                Check repository permissions or try another repo from the dashboard.
              </p>
            </div>
          ) : (
            <div className="relative w-full max-w-sm">
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center justify-between w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm hover:border-violet-300 transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <GitBranch className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{selectedBranch || "Select a branch"}</span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {dropdownOpen && (
                <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {branches.map((branch) => (
                    <button
                      type="button"
                      key={branch}
                      onClick={() => void handleBranchSelect(branch)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-violet-50 hover:text-violet-700 transition-colors ${
                        selectedBranch === branch ? "bg-violet-50 text-violet-700 font-medium" : "text-gray-700"
                      }`}
                    >
                      <GitBranch className="w-3 h-3 inline mr-2 text-gray-400" />
                      {branch}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!loadingBranches && selectedBranch && branches.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Open the menu above to switch branches — AI reads that branch&apos;s README.
            </p>
          )}
        </CardContent>
      </Card>

      {loadingReadme && (
        <Card className="mb-6 border-violet-200 bg-violet-50">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3 text-violet-700">
              <Loader2 className="w-5 h-5 animate-spin shrink-0" />
              <div>
                <p className="font-medium text-sm">Reading README…</p>
                <p className="text-xs text-violet-500 mt-0.5">AI is extracting setup information</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI-parsed setup info */}
      {setupInfo && !loadingReadme && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-green-800">
              <Package className="w-4 h-4" />
              Project Setup Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="text-xs font-semibold text-green-700 w-14 shrink-0 mt-0.5">Install</span>
              <code className="text-sm bg-white px-2 py-0.5 rounded border border-green-200 text-gray-700 font-mono flex-1 break-all">
                {setupInfo.install}
              </code>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xs font-semibold text-green-700 w-14 shrink-0 mt-0.5">Start</span>
              <code className="text-sm bg-white px-2 py-0.5 rounded border border-green-200 text-gray-700 font-mono flex-1 break-all">
                {setupInfo.start}
              </code>
            </div>
            {setupInfo.notes && (
              <div className="flex items-start gap-3">
                <span className="text-xs font-semibold text-green-700 w-14 shrink-0 mt-0.5">Notes</span>
                <p className="text-sm text-green-800 flex-1">{setupInfo.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Editable run commands override (Phase 5) */}
      {setupInfo && !loadingReadme && (
        <div className="mb-6">
          <RunCommandsCard
            initialInstall={installCmd}
            initialStart={startCmd}
            onSave={(install, start) => {
              setInstallCmd(install);
              setStartCmd(start);
            }}
          />
        </div>
      )}

      <Button
        size="lg"
        onClick={handleStartEditing}
        disabled={!selectedBranch || loadingBranches || loadingReadme || branches.length === 0}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2"
      >
        <Play className="w-4 h-4" />
        Start Editing with AI
      </Button>

      {!selectedBranch && !loadingBranches && branches.length > 0 && (
        <p className="text-center text-sm text-gray-400 mt-3">Select a branch above to continue.</p>
      )}
    </div>
  );
}
