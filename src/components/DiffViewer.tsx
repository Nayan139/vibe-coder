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
};

// Wrapped in an object so React doesn't treat the component fn as a setState updater
type DiffViewerLib = { Component: React.ComponentType<DiffViewerLibProps> };

function LazyDiffPanel({
  original,
  changed,
  filePath,
}: {
  original: string;
  changed: string;
  filePath: string;
}) {
  const [lib, setLib] = useState<DiffViewerLib | null>(null);

  useEffect(() => {
    import("react-diff-viewer-continued").then((mod) => {
      setLib({ Component: mod.default as unknown as React.ComponentType<DiffViewerLibProps> });
    });
  }, []);

  if (!lib) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
        Loading diff viewer...
      </div>
    );
  }

  const { Component: Viewer } = lib;
  return (
    <div className="text-xs overflow-auto">
      <Viewer
        oldValue={original}
        newValue={changed}
        splitView={true}
        useDarkTheme={false}
        leftTitle={`Before — ${filePath}`}
        rightTitle="After (AI Changes)"
      />
    </div>
  );
}

interface DiffViewerProps {
  originalFiles: Record<string, string>;
  changedFiles: Record<string, string>;
  onApply: () => void;
  onDiscard: () => void;
}

export function DiffViewer({ originalFiles, changedFiles, onApply, onDiscard }: DiffViewerProps) {
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
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <FileCode className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="font-semibold text-gray-600 mb-1">Diff Preview</h3>
        <p className="text-sm text-gray-400">
          AI changes will appear here. Type a prompt and send it to see the diff.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* File tabs */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-gray-100 overflow-x-auto shrink-0">
        {changedPaths.map((path) => {
          const fileName = path.split("/").pop() ?? path;
          return (
            <button
              key={path}
              onClick={() => setActiveFile(path)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeFile === path
                  ? "bg-violet-100 text-violet-700"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              <FileCode className="w-3 h-3 shrink-0" />
              {fileName}
            </button>
          );
        })}
        <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
          {changedPaths.length} file{changedPaths.length !== 1 ? "s" : ""} changed
        </Badge>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto">
        {activeFile && (
          <LazyDiffPanel
            original={originalFiles[activeFile] ?? ""}
            changed={changedFiles[activeFile] ?? ""}
            filePath={activeFile}
          />
        )}
      </div>

      {/* Apply / Discard */}
      <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0 bg-white">
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
    </div>
  );
}
