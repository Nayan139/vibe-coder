"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, GitBranch, Package, Play, Loader2, ChevronDown, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StepProgress } from "@/components/StepProgress";

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
  const repoName = repoFullName.split("/").pop() ?? repoFullName;

  useEffect(() => {
    async function fetchBranches() {
      setLoadingBranches(true);
      try {
        const res = await fetch(
          `/api/git/branches?connectionId=${connectionId}&repo=${encodeURIComponent(repoFullName)}`
        );
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error ?? "Failed to load branches");
          return;
        }
        const data: string[] = await res.json();
        setBranches(data);
        const defaultBranch = data.find((b) => b === "main") ?? data.find((b) => b === "master") ?? data[0] ?? "";
        setSelectedBranch(defaultBranch);
      } catch {
        toast.error("Network error while loading branches.");
      } finally {
        setLoadingBranches(false);
      }
    }
    fetchBranches();
  }, [connectionId, repoFullName]);

  async function handleBranchSelect(branch: string) {
    setSelectedBranch(branch);
    setDropdownOpen(false);
    setSetupInfo(null);
    setLoadingReadme(true);

    try {
      // Fetch README content
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
        setSetupInfo({ install: "npm install", start: "npm run dev", notes: "No README found." });
        return;
      }

      const { content, exists } = await fileRes.json();
      if (!exists || !content) {
        setSetupInfo({ install: "npm install", start: "npm run dev", notes: "No README found." });
        return;
      }

      // Parse README with AI
      const parseRes = await fetch("/api/ai/parse-readme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readmeContent: content }),
      });

      if (!parseRes.ok) {
        setSetupInfo({ install: "npm install", start: "npm run dev", notes: "Could not parse README." });
        return;
      }

      const parsed = await parseRes.json();
      setSetupInfo(parsed);
    } catch {
      toast.error("Failed to fetch or parse README.");
      setSetupInfo({ install: "npm install", start: "npm run dev", notes: "" });
    } finally {
      setLoadingReadme(false);
    }
  }

  function handleStartEditing() {
    if (!selectedBranch) {
      toast.error("Please select a branch first.");
      return;
    }
    router.push(
      `/dashboard/repo/${connectionId}/${encodeURIComponent(repoFullName)}/edit?branch=${encodeURIComponent(selectedBranch)}`
    );
  }

  return (
    <div className="px-8 py-10 max-w-3xl mx-auto">
      <StepProgress currentStep={2} />

      {/* Back + Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="gap-2 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
          Repositories
        </Button>
      </div>

      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
          <Code2 className="w-6 h-6 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{repoName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs capitalize">
              {provider}
            </Badge>
            <span className="text-sm text-gray-500">{username}</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-500 font-mono">{repoFullName}</span>
          </div>
        </div>
      </div>

      {/* Branch Selector */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-violet-600" />
            Select Branch
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingBranches ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading branches...
            </div>
          ) : (
            <div className="relative w-full max-w-sm">
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center justify-between w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm hover:border-violet-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <GitBranch className="w-3.5 h-3.5 text-gray-400" />
                  {selectedBranch || "Select a branch"}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {branches.map((branch) => (
                    <button
                      key={branch}
                      onClick={() => handleBranchSelect(branch)}
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
          {!loadingBranches && selectedBranch && (
            <p className="text-xs text-gray-400 mt-2">
              Click the branch name above to change — AI will read that branch&apos;s README.
            </p>
          )}
        </CardContent>
      </Card>

      {/* README Parsing Loading */}
      {loadingReadme && (
        <Card className="mb-6 border-violet-200 bg-violet-50">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3 text-violet-700">
              <Loader2 className="w-5 h-5 animate-spin" />
              <div>
                <p className="font-medium text-sm">Reading README...</p>
                <p className="text-xs text-violet-500 mt-0.5">AI is extracting setup information</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Info Card */}
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
              <code className="text-sm bg-white px-2 py-0.5 rounded border border-green-200 text-gray-700 font-mono flex-1">
                {setupInfo.install}
              </code>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xs font-semibold text-green-700 w-14 shrink-0 mt-0.5">Start</span>
              <code className="text-sm bg-white px-2 py-0.5 rounded border border-green-200 text-gray-700 font-mono flex-1">
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

      {/* Start Editing Button */}
      <Button
        size="lg"
        onClick={handleStartEditing}
        disabled={!selectedBranch || loadingBranches || loadingReadme}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2"
      >
        <Play className="w-4 h-4" />
        Start Editing with AI
      </Button>

      {!selectedBranch && !loadingBranches && (
        <p className="text-center text-sm text-gray-400 mt-3">Select a branch above to continue.</p>
      )}
    </div>
  );
}
