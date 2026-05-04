"use client";

import { CheckCircle2, ExternalLink, GitPullRequest, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface PRResultCardProps {
  prUrl: string;
  prTitle: string;
  prNumber: number;
  newBranch: string;
  baseBranch: string;
  onStartNew: () => void;
}

export function PRResultCard({ prUrl, prTitle, prNumber, newBranch, baseBranch, onStartNew }: PRResultCardProps) {
  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardContent className="pt-6 pb-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-green-900 text-lg mb-1">Pull Request Created!</h3>
            <div className="flex items-center gap-2 mb-3">
              <GitPullRequest className="w-4 h-4 text-green-600 shrink-0" />
              <span className="text-sm text-green-800 font-medium truncate">{prTitle}</span>
              <Badge className="bg-green-100 text-green-700 border-0 text-xs shrink-0">#{prNumber}</Badge>
            </div>

            <div className="flex items-center gap-2 text-xs text-green-700 mb-4 font-mono bg-white/60 px-2.5 py-1.5 rounded-lg border border-green-200 w-fit">
              <span className="text-green-500">branch:</span>
              <span>{newBranch}</span>
              <span className="text-green-300 mx-0.5">→</span>
              <span>{baseBranch}</span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => window.open(prUrl, "_blank")}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View PR on GitHub
              </Button>
              <Button onClick={onStartNew} variant="outline" className="gap-2 border-green-300 text-green-700 hover:bg-green-50">
                <PlusCircle className="w-4 h-4" />
                Start New Edit
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
