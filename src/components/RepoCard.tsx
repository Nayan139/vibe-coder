import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { GitFork, Star, Lock, Globe, Clock, WandSparkles } from "lucide-react";

export interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  html_url: string;
  connectionId: string;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "bg-blue-500",
  JavaScript: "bg-yellow-400",
  Python: "bg-green-500",
  Go: "bg-cyan-500",
  Rust: "bg-orange-500",
  Java: "bg-red-500",
  "C++": "bg-pink-500",
  Ruby: "bg-red-400",
};

const LANGUAGE_LIGHT: Record<string, string> = {
  TypeScript: "from-blue-50",
  JavaScript: "from-yellow-50",
  Python: "from-green-50",
  Go: "from-cyan-50",
  Rust: "from-orange-50",
  Java: "from-red-50",
  "C++": "from-pink-50",
  Ruby: "from-red-50",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function RepoCard({ repo }: Readonly<{ repo: Repo }>) {
  const langColor = LANGUAGE_COLORS[repo.language ?? ""] ?? "bg-slate-300";
  const langLight = LANGUAGE_LIGHT[repo.language ?? ""] ?? "from-slate-50";

  return (
    <Link href={`/dashboard/repo/${repo.connectionId}/${encodeURIComponent(repo.full_name)}`}>
      <Card className="group relative h-full cursor-pointer overflow-hidden border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-rose-200/70 hover:shadow-lg hover:shadow-rose-100/60">
        {/* Language accent bar */}
        <div className={`h-1 w-full ${repo.language ? langColor : "bg-linear-to-r from-rose-400 to-amber-400"}`} />

        {/* Hover gradient overlay */}
        <div className={`pointer-events-none absolute inset-0 mt-1 bg-linear-to-b ${langLight} to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-60`} />

        <CardContent className="relative flex h-full flex-col pb-4 pt-4">
          {/* Name row */}
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              {repo.private ? (
                <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              ) : (
                <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              )}
              <span className="truncate text-sm font-semibold text-slate-900 transition-colors duration-200 group-hover:text-rose-600">
                {repo.name}
              </span>
            </div>
            <Badge
              variant="secondary"
              className="shrink-0 text-[10px] px-1.5 py-0 h-5"
            >
              {repo.private ? "Private" : "Public"}
            </Badge>
          </div>

          {/* Description */}
          <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-500">
            {repo.description || <span className="italic text-slate-400">No description</span>}
          </p>

          {/* Footer stats */}
          <div className="flex items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
            {repo.language && (
              <div className="flex items-center gap-1.5">
                <div className={`h-2.5 w-2.5 rounded-full ${langColor}`} />
                <span>{repo.language}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              <span>{repo.stargazers_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <GitFork className="h-3 w-3" />
              <span>{repo.forks_count}</span>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{timeAgo(repo.updated_at)}</span>
            </div>
          </div>

          {/* Hover CTA */}
          <div className="mt-2.5 flex items-center gap-1.5 opacity-0 transition-all duration-200 group-hover:opacity-100">
            <WandSparkles className="h-3.5 w-3.5 text-rose-500" />
            <span className="text-xs font-medium text-rose-600">Start editing with AI</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
