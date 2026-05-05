"use client";

export type SyncStatus = "idle" | "syncing" | "done";

interface HotSyncIndicatorProps {
  status: SyncStatus;
  lastSyncedFiles: string[];
}

export function HotSyncIndicator({ status, lastSyncedFiles }: HotSyncIndicatorProps) {
  if (status === "idle") return null;

  return (
    <div
      className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full transition-all border
        ${status === "syncing" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : ""}
        ${status === "done" ? "bg-green-50 text-green-700 border-green-200" : ""}`}
    >
      {status === "syncing" && (
        <>
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
          Syncing changes to preview…
        </>
      )}
      {status === "done" && (
        <>
          <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
          Preview updated — {lastSyncedFiles.length} file{lastSyncedFiles.length !== 1 ? "s" : ""} hot-reloaded
        </>
      )}
    </div>
  );
}
