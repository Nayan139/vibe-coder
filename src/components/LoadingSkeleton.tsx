import { Bot, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function RepoCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Language accent bar */}
      <div className="h-1 w-full bg-linear-to-r from-rose-200 to-amber-200" />
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3.5 w-3.5 rounded" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="ml-auto h-3 w-14" />
        </div>
      </div>
    </div>
  );
}

export function RepoGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <RepoCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-4/5" />
      <Skeleton className="h-6 w-full" />
    </div>
  );
}

export function BranchSelectorSkeleton() {
  return (
    <div className="max-w-sm space-y-3">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function FileTreeSkeleton() {
  return (
    <div className="space-y-2 px-3 py-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${8 + (i % 4) * 12}px` }}>
          <Skeleton className="h-3.5 w-3.5 shrink-0 rounded" />
          <Skeleton className="h-3 max-w-[70%] flex-1" />
        </div>
      ))}
    </div>
  );
}

export function AIThinkingSkeleton() {
  return (
    <div className="flex justify-start gap-3 px-4">
      <div className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        <Bot className="h-4 w-4" />
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-300 opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-400" />
        </span>
      </div>
      <div className="min-w-50 max-w-[85%] rounded-2xl rounded-bl-sm border border-rose-100 bg-linear-to-br from-rose-50/70 to-amber-50/60 px-3 py-3 shadow-sm">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-rose-600">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          AI is preparing your update...
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full bg-slate-200/80" />
          <Skeleton className="h-3 w-5/6 bg-slate-200/80" />
          <Skeleton className="h-3 w-4/6 bg-slate-200/80" />
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rose-400 [animation-delay:-0.2s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rose-400 [animation-delay:-0.1s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rose-400" />
          <span className="ml-1">Analyzing files and generating diff</span>
        </div>
      </div>
    </div>
  );
}
