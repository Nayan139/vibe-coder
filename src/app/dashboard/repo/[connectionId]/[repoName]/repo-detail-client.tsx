"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, GitBranch, Package, Play, Loader2, ChevronDown, FolderGit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StepProgress } from "@/components/StepProgress";
import { RunCommandsCard } from "@/components/RunCommandsCard";
import { EnvVarsCard } from "@/components/EnvVarsCard";
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

  const [installCmd, setInstallCmd] = useState("npm install");
  const [startCmd, setStartCmd] = useState("npm run dev");

  const [projectId, setProjectId] = useState<string | null>(null);

  const repoName = repoFullName.split("/").pop() ?? repoFullName;

  const loadReadmeForBranch = useCallback(
    async (branch: string) => {
      if (!branch) return;
      setLoadingReadme(true);
      setSetupInfo(null);

      let savedInstall: string | null = null;
      let savedStart: string | null = null;
      try {
        const projRes = await fetch("/api/projects/get-or-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId, repoFullName, repoName, branch }),
        });
        if (projRes.ok) {
          const projData = await projRes.json() as {
            success?: boolean;
            projectId?: string;
            runCommand?: string | null;
            installCommand?: string | null;
          };
          if (projData.success && projData.projectId) {
            setProjectId(projData.projectId);
            savedInstall = projData.installCommand ?? null;
            savedStart = projData.runCommand ?? null;
            if (savedInstall) setInstallCmd(savedInstall);
            if (savedStart) setStartCmd(savedStart);
          }
        }
      } catch {
        // non-critical
      }

      try {
        const fileRes = await fetch("/api/git/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId, repo: repoFullName, branch, filePath: "README.md" }),
        });

        if (!fileRes.ok) {
          const errBody = await fileRes.json().catch(() => ({})) as { error?: string };
          toast.info(errBody.error ?? "README not available — using default setup hints.");
          const defaults = { install: "npm install", start: "npm run dev", notes: "No README found." };
          setSetupInfo(defaults);
          if (!savedInstall) setInstallCmd(defaults.install);
          if (!savedStart) setStartCmd(defaults.start);
          return;
        }

        const fileJson = await fileRes.json().catch(() => ({})) as { content?: string; exists?: boolean };
        const content = typeof fileJson.content === "string" ? fileJson.content : "";
        const exists = fileJson.exists !== false;

        if (!exists || !content) {
          const defaults = { install: "npm install", start: "npm run dev", notes: "No README found." };
          setSetupInfo(defaults);
          if (!savedInstall) setInstallCmd(defaults.install);
          if (!savedStart) setStartCmd(defaults.start);
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
          if (!savedInstall) setInstallCmd(defaults.install);
          if (!savedStart) setStartCmd(defaults.start);
          return;
        }

        const parsed = await parseRes.json().catch(() => null) as Record<string, string> | null;
        if (!parsed || typeof parsed !== "object") {
          const defaults = { install: "npm install", start: "npm run dev", notes: "Invalid parse response." };
          setSetupInfo(defaults);
          if (!savedInstall) setInstallCmd(defaults.install);
          if (!savedStart) setStartCmd(defaults.start);
          return;
        }

        const info = {
          install: typeof parsed.install === "string" ? parsed.install : "npm install",
          start: typeof parsed.start === "string" ? parsed.start : "npm run dev",
          notes: typeof parsed.notes === "string" ? parsed.notes : "",
        };
        setSetupInfo(info);
        if (!savedInstall) setInstallCmd(info.install);
        if (!savedStart) setStartCmd(info.start);
      } catch {
        toast.error("Failed to fetch or parse README.");
        const defaults = { install: "npm install", start: "npm run dev", notes: "" };
        setSetupInfo(defaults);
        if (!savedInstall) setInstallCmd(defaults.install);
        if (!savedStart) setStartCmd(defaults.start);
      } finally {
        setLoadingReadme(false);
      }
    },
    [connectionId, repoFullName, repoName]
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
    if (projectId) params.set("projectId", projectId);
    router.push(
      `/dashboard/repo/${connectionId}/${encodeURIComponent(repoFullName)}/edit?${params.toString()}`
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-0 md:py-10">
      {/* Step progress */}
      <div className="mb-8">
        <StepProgress currentStep={3} />
      </div>

      {/* Back */}
      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="mb-6 flex cursor-pointer items-center gap-2 text-sm text-slate-500 transition-colors hover:text-rose-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to repositories
      </button>

      {/* Repo header */}
      <div className="relative mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-rose-500 to-amber-400" />
        <div className="absolute inset-0 bg-[radial-gradient(500px_circle_at_0%_0%,rgba(244,63,94,0.04),transparent_60%)]" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-rose-500 to-amber-400 shadow-sm shadow-rose-200">
            <FolderGit2 className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word text-xl font-bold text-slate-900 sm:text-2xl">{repoName}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs capitalize">{provider}</Badge>
              <span className="text-sm text-slate-500">{username}</span>
              <span className="hidden text-slate-300 sm:inline">·</span>
              <code className="block text-xs text-slate-400 sm:inline">{repoFullName}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Branch selector */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <GitBranch className="h-4 w-4 text-rose-500" />
          Select Branch
        </div>

        {loadingBranches ? (
          <BranchSelectorSkeleton />
        ) : branches.length === 0 ? (
          <div className="py-2 text-sm">
            <p className="font-medium text-slate-700">No branches available</p>
            <p className="mt-1 text-xs text-slate-400">
              Check repository permissions or try another repo from the dashboard.
            </p>
          </div>
        ) : (
          <div className="relative max-w-sm">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm transition-all duration-200 hover:border-rose-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-400/20"
            >
              <span className="flex min-w-0 items-center gap-2">
                <GitBranch className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{selectedBranch || "Select a branch"}</span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
                <div className="max-h-60 overflow-y-auto">
                  {branches.map((branch) => (
                    <button
                      type="button"
                      key={branch}
                      onClick={() => void handleBranchSelect(branch)}
                      className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                        selectedBranch === branch
                          ? "bg-rose-50 font-medium text-rose-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <GitBranch className="h-3 w-3 shrink-0 text-slate-400" />
                      {branch}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loadingBranches && selectedBranch && branches.length > 0 && (
          <p className="mt-3 text-xs text-slate-400">
            Open the menu above to switch branches — AI reads that branch&apos;s README.
          </p>
        )}
      </div>

      {/* README loading */}
      {loadingReadme && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
          <div className="flex items-center gap-3 text-rose-700">
            <Loader2 className="h-5 w-5 animate-spin shrink-0" />
            <div>
              <p className="text-sm font-semibold">Reading README…</p>
              <p className="mt-0.5 text-xs text-rose-500">AI is extracting project setup information</p>
            </div>
          </div>
        </div>
      )}

      {/* AI-parsed setup info */}
      {setupInfo && !loadingReadme && (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <div className="mb-3.5 flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <Package className="h-4 w-4" />
            Project Setup Info
          </div>
          <div className="space-y-2.5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 w-14 shrink-0 text-xs font-semibold text-emerald-700">Install</span>
              <code className="flex-1 break-all rounded-lg border border-emerald-200 bg-white px-3 py-1.5 font-mono text-sm text-slate-700">
                {setupInfo.install}
              </code>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 w-14 shrink-0 text-xs font-semibold text-emerald-700">Start</span>
              <code className="flex-1 break-all rounded-lg border border-emerald-200 bg-white px-3 py-1.5 font-mono text-sm text-slate-700">
                {setupInfo.start}
              </code>
            </div>
            {setupInfo.notes && (
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-14 shrink-0 text-xs font-semibold text-emerald-700">Notes</span>
                <p className="flex-1 text-sm text-emerald-800">{setupInfo.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editable run commands */}
      {setupInfo && !loadingReadme && (
        <div className="mb-5">
          <RunCommandsCard
            projectId={projectId ?? undefined}
            initialInstall={installCmd}
            initialStart={startCmd}
            onSave={(install, start) => {
              setInstallCmd(install);
              setStartCmd(start);
            }}
          />
        </div>
      )}

      {/* ENV vars */}
      {projectId && !loadingReadme && (
        <div className="mb-6">
          <EnvVarsCard projectId={projectId} />
        </div>
      )}

      {/* CTA */}
      <Button
        size="lg"
        onClick={handleStartEditing}
        disabled={!selectedBranch || loadingBranches || loadingReadme || branches.length === 0}
        className="h-12 w-full cursor-pointer gap-2 border-0 bg-linear-to-r from-rose-500 to-amber-400 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-xl hover:shadow-rose-200/60 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        <Play className="h-4 w-4" />
        Start Editing with AI
      </Button>

      {!selectedBranch && !loadingBranches && branches.length > 0 && (
        <p className="mt-3 text-center text-sm text-slate-400">Select a branch above to continue.</p>
      )}
    </div>
  );
}
