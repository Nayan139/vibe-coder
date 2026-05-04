"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="flex flex-col items-center justify-center min-h-100 gap-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-violet-100 to-blue-100 flex items-center justify-center mx-auto mb-4">
          <GitBranch className="w-8 h-8 text-violet-600" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Connect your Git account</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          Connect GitHub or GitLab to grant VibeCode access to your repositories. This is
          separate from your login — it lets AI read and write your code.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <a href="/api/auth/github">
          <Button className="gap-2 bg-gray-900 hover:bg-gray-800 text-white border-0 px-6">
            <GithubIcon className="w-4 h-4" />
            Connect GitHub
            <ArrowRight className="w-4 h-4" />
          </Button>
        </a>
        <a href="/api/auth/gitlab">
          <Button variant="outline" className="gap-2 px-6 text-orange-600 border-orange-200 hover:bg-orange-50">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0118.6 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51L23 13.45a.84.84 0 01-.35.94z" />
            </svg>
            Connect GitLab
            <ArrowRight className="w-4 h-4" />
          </Button>
        </a>
      </div>

      <Card className="border-dashed border-gray-200 max-w-sm w-full">
        <CardContent className="py-4 px-5">
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            We only request the minimum required permissions to read files and create branches/PRs on
            your behalf. We never store your private code.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
