"use client";

import { Button } from "@/components/ui/button";
import { GitBranch, ArrowRight } from "lucide-react";

interface ConnectGitCardProps {
  hasConnections: boolean;
}

function GithubIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function ConnectGitCard({ hasConnections }: Readonly<ConnectGitCardProps>) {
  if (hasConnections) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-rose-500 to-amber-400" />
      <div className="absolute inset-0 bg-[radial-gradient(700px_circle_at_10%_10%,rgba(244,63,94,0.05),transparent_60%)]" />
      <div className="relative flex min-h-120 flex-col items-center justify-center gap-7 px-6 py-14">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-rose-500 to-amber-400 shadow-md shadow-rose-200">
            <GitBranch className="h-7 w-7 text-white" />
          </div>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            Connect your Git account
          </h2>
          <p className="text-sm leading-relaxed text-slate-500">
            Connect GitHub or GitLab to grant VibeCode access to your repositories. This lets AI
            read and write your code — separate from your login.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <a href="/api/auth/github">
            <Button className="cursor-pointer gap-2 border-0 bg-slate-900 px-6 text-white transition-all duration-200 hover:bg-slate-800 hover:shadow-md">
              <GithubIcon className="h-4 w-4" />
              Connect GitHub
              <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
          <a href="/api/auth/gitlab">
            <Button
              variant="outline"
              className="cursor-pointer gap-2 border-orange-200 px-6 text-orange-600 transition-all duration-200 hover:border-orange-300 hover:bg-orange-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0118.6 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51L23 13.45a.84.84 0 01-.35.94z" />
              </svg>
              Connect GitLab
              <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
        </div>

        <div className="w-full max-w-sm rounded-xl border border-rose-100 bg-rose-50/40 px-5 py-3">
          <p className="text-center text-xs leading-relaxed text-slate-500">
            We only request the minimum required permissions to read files and create branches/PRs
            on your behalf. We never store your private code.
          </p>
        </div>
      </div>
    </div>
  );
}
