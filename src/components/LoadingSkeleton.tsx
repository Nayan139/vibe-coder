import { Skeleton } from "@/components/ui/skeleton";

export function RepoCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex items-center gap-4 pt-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function RepoGridSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
    <div className="space-y-3 max-w-sm">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function FileTreeSkeleton() {
  return (
    <div className="px-3 py-2 space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${8 + (i % 4) * 12}px` }}>
          <Skeleton className="h-3.5 w-3.5 shrink-0 rounded" />
          <Skeleton className="h-3 flex-1 max-w-[70%]" />
        </div>
      ))}
    </div>
  );
}

export function AIThinkingSkeleton() {
  return (
    <div className="flex gap-3 justify-start px-4">
      <Skeleton className="w-7 h-7 rounded-full shrink-0" />
      <div className="bg-gray-100 rounded-xl rounded-bl-sm px-3 py-3 space-y-2 min-w-[200px] max-w-[85%]">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
    </div>
  );
}
