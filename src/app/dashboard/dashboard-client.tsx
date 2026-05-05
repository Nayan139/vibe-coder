"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { RepoCard, type Repo } from "@/components/RepoCard";
import { ConnectGitCard } from "@/components/ConnectGitCard";
import { RepoGridSkeleton } from "@/components/LoadingSkeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, FolderGit2, Sparkles, ArrowUpRight } from "lucide-react";

function GithubIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

interface GitConnection {
  id: string;
  provider: "github" | "gitlab";
  username: string | null;
  avatar_url: string | null;
}

interface DashboardClientProps {
  connections: GitConnection[];
}

export function DashboardClient({ connections }: DashboardClientProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeConnection, setActiveConnection] = useState<string | null>(
    connections[0]?.id ?? null
  );

  const fetchRepos = useCallback(async (connectionId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/git/repos?connectionId=${connectionId}`);
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to load repositories.");
        return;
      }
      const data: Repo[] = await res.json();
      setRepos(data);
      if (data.length > 0) {
        toast.success(`Loaded ${data.length} repositor${data.length === 1 ? "y" : "ies"}.`);
      }
    } catch {
      toast.error("Network error while fetching repositories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeConnection) return;
    queueMicrotask(() => {
      void fetchRepos(activeConnection);
    });
  }, [activeConnection, fetchRepos]);

  const hasConnections = connections.length > 0;

  const filtered = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (!hasConnections) {
    return <ConnectGitCard hasConnections={false} />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-rose-500 to-amber-400" />
        <div className="absolute inset-0 bg-[radial-gradient(600px_circle_at_0%_0%,rgba(244,63,94,0.05),transparent_60%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600">
              <Sparkles className="h-3 w-3" />
              AI Workspace
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Your repositories
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
              Select a repository to start making AI-powered changes with preview-ready diffs and smoother review flow.
            </p>
          </div>
          <div className="flex shrink-0 items-center divide-x divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/80">
            <div className="px-5 py-3 text-center">
              <p className="text-xl font-bold text-slate-900">{connections.length}</p>
              <p className="text-xs text-slate-500">Linked</p>
            </div>
            <div className="px-5 py-3 text-center">
              <p className="text-xl font-bold text-slate-900">{repos.length}</p>
              <p className="text-xs text-slate-500">Repos</p>
            </div>
            <div className="px-5 py-3 text-center">
              <p className="text-xl font-bold text-slate-900">{filtered.length}</p>
              <p className="text-xs text-slate-500">Shown</p>
            </div>
          </div>
        </div>
      </div>

      {/* Connection switcher */}
      {connections.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          {connections.map((conn) => (
            <Button
              key={conn.id}
              variant={activeConnection === conn.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveConnection(conn.id)}
              className="cursor-pointer gap-2 transition-all duration-200"
            >
              {conn.provider === "github" ? (
                <GithubIcon className="h-3.5 w-3.5" />
              ) : (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0118.6 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51L23 13.45a.84.84 0 01-.35.94z" />
                </svg>
              )}
              {conn.username ?? conn.provider}
            </Button>
          ))}
        </div>
      )}

      {/* Search + refresh toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 border-slate-200 pl-9 focus-visible:ring-rose-500"
          />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="hidden text-xs text-slate-400 sm:block">
            {filtered.length} of {repos.length} repo{repos.length === 1 ? "" : "s"}
          </span>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeConnection && fetchRepos(activeConnection)}
            disabled={loading}
            className="cursor-pointer gap-1.5 border-slate-200 text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-600"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Repo grid / empty states */}
      {loading ? (
        <RepoGridSkeleton />
      ) : filtered.length === 0 && repos.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <Search className="h-6 w-6 text-slate-400" />
          </div>
          <p className="font-medium text-slate-700">No repositories match &quot;{search}&quot;</p>
          <p className="mt-1 text-sm text-slate-400">Try a different search term.</p>
        </div>
      ) : repos.length === 0 && !loading ? (
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-rose-50 to-amber-50">
            <FolderGit2 className="h-6 w-6 text-rose-400" />
          </div>
          <p className="font-semibold text-slate-900">No repositories found.</p>
          <p className="mt-2 text-sm text-slate-500">
            Try <strong>Refresh</strong>, connect the other provider, or confirm your Git account has repos you can access.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-end">
        <Button variant="ghost" size="sm" className="cursor-pointer gap-1 text-slate-400 transition-colors hover:text-rose-600">
          More filters coming soon
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
