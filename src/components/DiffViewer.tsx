"use client";

import { useState, useEffect } from "react";
import { FileCode, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type DiffViewerLibProps = {
  oldValue: string;
  newValue: string;
  splitView: boolean;
  useDarkTheme: boolean;
  leftTitle: string;
  rightTitle: string;
  extraLinesSurroundingDiff?: number;
  hideLineNumbers?: boolean;
  showDiffOnly?: boolean;
};

type DiffViewerLib = { Component: React.ComponentType<DiffViewerLibProps> };

function LazyDiffPanel({ original, changed }: { original: string; changed: string }) {
  const [lib, setLib] = useState<DiffViewerLib | null>(null);

  useEffect(() => {
    import("react-diff-viewer-continued").then((mod) => {
      setLib({ Component: mod.default as unknown as React.ComponentType<DiffViewerLibProps> });
    });
  }, []);

  if (!lib) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
        Loading diff viewer…
      </div>
    );
  }

  const { Component: Viewer } = lib;
  return (
    <div
      className="text-xs"
      style={{ overflowX: "auto", overflowY: "auto", maxHeight: "70vh", minWidth: 0 }}
    >
      <Viewer
        oldValue={original}
        newValue={changed}
        splitView={true}
        useDarkTheme={false}
        leftTitle={original === "" ? "(new file)" : "Before"}
        rightTitle="After (AI Changes)"
        extraLinesSurroundingDiff={3}
        hideLineNumbers={false}
        showDiffOnly={true}
      />
    </div>
  );
}

interface DiffViewerProps {
  originalFiles: Record<string, string>;
  changedFiles: Record<string, string>;
  onApply?: () => void;
  onDiscard?: () => void;
  showActions?: boolean;
}

export function DiffViewer({
  originalFiles,
  changedFiles,
  onApply,
  onDiscard,
  showActions = true,
}: DiffViewerProps) {
  const changedPaths = Object.keys(changedFiles);
  const [activeFile, setActiveFile] = useState(changedPaths[0] ?? "");

  useEffect(() => {
    if (changedPaths.length > 0 && !changedPaths.includes(activeFile)) {
      setActiveFile(changedPaths[0]);
    }
  }, [changedPaths, activeFile]);

  if (changedPaths.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <FileCode className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="font-semibold text-slate-600 mb-1">Diff Preview</h3>
        <p className="text-sm text-slate-400">
          AI changes will appear here. Type a prompt and send it to see the diff.
        </p>
      </div>
    );
  }

  const isNew = (path: string) => !originalFiles[path] || originalFiles[path] === "";
  return (
    <div className="flex flex-col h-full">
      {/* File tabs */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-slate-100 overflow-x-auto shrink-0">
        {changedPaths.map((path) => {
          const fileName = path.split("/").pop() ?? path;
          const newFile = isNew(path);
          return (
            <button
              key={path}
              onClick={() => setActiveFile(path)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                activeFile === path
                  ? "bg-rose-50 text-rose-600"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              <FileCode className="w-3 h-3 shrink-0" />
              {fileName}
              {newFile && (
                <span className="bg-green-500 text-white text-[10px] px-1 rounded font-bold">NEW</span>
              )}
            </button>
          );
        })}
        <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
          {changedPaths.length} file{changedPaths.length !== 1 ? "s" : ""} changed
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeFile && (
          <LazyDiffPanel
            original={originalFiles[activeFile] ?? ""}
            changed={changedFiles[activeFile] ?? ""}
          />
        )}
      </div>

      {/* Apply / Discard */}
      {showActions && onApply && onDiscard && (
        <div className="border-t border-slate-100 px-4 py-3 flex items-center gap-3 shrink-0 bg-white">
          <Button onClick={onApply} className="bg-green-600 hover:bg-green-700 text-white gap-2 flex-1">
            <CheckCircle2 className="w-4 h-4" />
            Apply Changes
          </Button>
          <Button
            onClick={onDiscard}
            variant="outline"
            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            <XCircle className="w-4 h-4" />
            Discard
          </Button>
        </div>
      )}
    </div>
  );
}
