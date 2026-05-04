"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { RepoCard, type Repo } from "@/components/RepoCard";
import { ConnectGitCard } from "@/components/ConnectGitCard";
import { RepoGridSkeleton } from "@/components/LoadingSkeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw } from "lucide-react";

function GithubIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
import { Badge } from "@/components/ui/badge";

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
    if (activeConnection) {
      fetchRepos(activeConnection);
    }
  }, [activeConnection, fetchRepos]);

  const hasConnections = connections.length > 0;

  const filtered = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (!hasConnections) {
    return (
      <div className="px-4 sm:px-6 md:px-8 py-8 md:py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Connect your Git account to get started.</p>
        </div>
        <ConnectGitCard hasConnections={false} />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 md:px-8 py-8 md:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Repositories</h1>
        <p className="text-gray-500 mt-1">
          Select a repository to start making AI-powered changes.
        </p>
      </div>

      {/* Connection Tabs */}
      {connections.length > 1 && (
        <div className="flex items-center gap-2 mb-6">
          {connections.map((conn) => (
            <Button
              key={conn.id}
              variant={activeConnection === conn.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveConnection(conn.id)}
              className="gap-2"
            >
              {conn.provider === "github" ? (
                <GithubIcon className="w-3.5 h-3.5" />
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0118.6 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51L23 13.45a.84.84 0 01-.35.94z" />
                </svg>
              )}
              {conn.username ?? conn.provider}
            </Button>
          ))}
        </div>
      )}

      {/* Search + Refresh */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => activeConnection && fetchRepos(activeConnection)}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        {!loading && (
          <Badge variant="secondary" className="text-xs">
            {filtered.length} repo{filtered.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Repo Grid */}
      {loading ? (
        <RepoGridSkeleton />
      ) : filtered.length === 0 && repos.length > 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No repositories match &quot;{search}&quot;</p>
          <p className="text-sm mt-1">Try a different search term.</p>
        </div>
      ) : repos.length === 0 && !loading ? (
        <div className="text-center py-16 text-gray-400 max-w-md mx-auto">
          <p className="font-medium text-gray-600">No repositories found.</p>
          <p className="text-sm mt-2">
            Try <strong>Refresh</strong>, connect the other provider, or confirm your Git account has repos you can
            access.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}
    </div>
  );
}
