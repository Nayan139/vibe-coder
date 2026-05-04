import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { GitFork, Star, Lock, Globe, Clock } from "lucide-react";

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

export function RepoCard({ repo }: { repo: Repo }) {
  return (
    <Link href={`/dashboard/repo/${repo.connectionId}/${encodeURIComponent(repo.full_name)}`}>
      <Card className="h-full border-gray-200 hover:border-violet-300 hover:shadow-md transition-all duration-200 cursor-pointer group">
        <CardContent className="pt-5 pb-4 flex flex-col h-full">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {repo.private ? (
                <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              )}
              <span className="font-semibold text-sm text-gray-900 truncate group-hover:text-violet-600 transition-colors">
                {repo.name}
              </span>
            </div>
            <Badge variant="secondary" className="text-xs shrink-0 ml-2">
              {repo.private ? "Private" : "Public"}
            </Badge>
          </div>

          <p className="text-sm text-gray-500 line-clamp-2 flex-1 mb-3 leading-relaxed">
            {repo.description || <span className="italic text-gray-400">No description</span>}
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-400">
            {repo.language && (
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${LANGUAGE_COLORS[repo.language] ?? "bg-gray-400"}`}
                />
                <span>{repo.language}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              <span>{repo.stargazers_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <GitFork className="w-3 h-3" />
              <span>{repo.forks_count}</span>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <Clock className="w-3 h-3" />
              <span>{timeAgo(repo.updated_at)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
