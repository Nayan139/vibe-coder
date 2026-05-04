"use client";

import { useState, useCallback, useEffect } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileCode, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileTreeSkeleton } from "@/components/LoadingSkeleton";

interface GitFileItem {
  name: string;
  path: string;
  type: "file" | "dir";
  sha?: string;
}

interface FileTreeProps {
  connectionId: string;
  repoFullName: string;
  branch: string;
  onFileSelect: (path: string) => void;
  selectedFile?: string;
  loadedFiles?: Set<string>;
}

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: TreeNode[];
  loaded?: boolean;
}

function buildTree(items: GitFileItem[]): TreeNode[] {
  return items.map((item) => ({
    name: item.name,
    path: item.path,
    type: item.type,
    children: item.type === "dir" ? [] : undefined,
    loaded: false,
  }));
}

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", ".cache", "coverage"]);

function FileNode({
  node,
  depth,
  connectionId,
  repoFullName,
  branch,
  onFileSelect,
  selectedFile,
  loadedFiles,
}: {
  node: TreeNode;
  depth: number;
  connectionId: string;
  repoFullName: string;
  branch: string;
  onFileSelect: (path: string) => void;
  selectedFile?: string;
  loadedFiles?: Set<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [children, setChildren] = useState<TreeNode[]>(node.children ?? []);
  const [loaded, setLoaded] = useState(false);

  const handleToggle = useCallback(async () => {
    if (node.type === "file") {
      onFileSelect(node.path);
      return;
    }

    if (!expanded && !loaded) {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/git/files?connectionId=${connectionId}&repo=${encodeURIComponent(repoFullName)}&branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(node.path)}`
        );
        if (res.ok) {
          const data: GitFileItem[] = await res.json();
          const filtered = data.filter((f) => !SKIP_DIRS.has(f.name));
          setChildren(buildTree(filtered));
          setLoaded(true);
        }
      } catch {
        // silently fail — tree stays collapsed
      } finally {
        setLoading(false);
      }
    }

    setExpanded((v) => !v);
  }, [node, expanded, loaded, connectionId, repoFullName, branch, onFileSelect]);

  const isSelected = selectedFile === node.path;
  const isLoaded = loadedFiles?.has(node.path);

  return (
    <div>
      <button
        onClick={handleToggle}
        className={cn(
          "flex items-center gap-1.5 w-full text-left px-2 py-1 rounded text-sm hover:bg-gray-100 transition-colors group",
          isSelected && "bg-violet-100 text-violet-700 hover:bg-violet-100",
          "text-gray-700"
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {node.type === "dir" ? (
          loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 shrink-0" />
          ) : expanded ? (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            </>
          ) : (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            </>
          )
        ) : (
          <>
            <span className="w-3.5 shrink-0" />
            <FileCode
              className={cn("w-3.5 h-3.5 shrink-0", isLoaded ? "text-violet-500" : "text-gray-400")}
            />
          </>
        )}
        <span className="truncate text-xs">{node.name}</span>
        {isLoaded && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
        )}
      </button>

      {node.type === "dir" && expanded && (
        <div>
          {children.length === 0 && loaded ? (
            <p className="text-xs text-gray-400 py-1" style={{ paddingLeft: `${24 + depth * 16}px` }}>
              Empty
            </p>
          ) : (
            children.map((child) => (
              <FileNode
                key={child.path}
                node={child}
                depth={depth + 1}
                connectionId={connectionId}
                repoFullName={repoFullName}
                branch={branch}
                onFileSelect={onFileSelect}
                selectedFile={selectedFile}
                loadedFiles={loadedFiles}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function FileTree({
  connectionId,
  repoFullName,
  branch,
  onFileSelect,
  selectedFile,
  loadedFiles,
}: FileTreeProps) {
  const [rootItems, setRootItems] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/git/files?connectionId=${connectionId}&repo=${encodeURIComponent(repoFullName)}&branch=${encodeURIComponent(branch)}&path=`
      );
      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? "Failed to load files");
        return;
      }
      const data: GitFileItem[] = await res.json();
      const filtered = data.filter((f) => !SKIP_DIRS.has(f.name));
      setRootItems(buildTree(filtered));
    } catch {
      setError("Network error while loading files.");
    } finally {
      setLoading(false);
    }
  }, [connectionId, repoFullName, branch]);

  // Load on mount
  useEffect(() => {
    fetchRoot();
  }, [fetchRoot]);

  if (loading) {
    return (
      <div className="py-2">
        <p className="px-3 pb-2 text-xs text-gray-400 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          Loading file tree…
        </p>
        <FileTreeSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-4">
        <p className="text-xs text-red-500 mb-2">{error}</p>
        <button onClick={fetchRoot} className="text-xs text-violet-600 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="py-2">
      {rootItems.map((node) => (
        <FileNode
          key={node.path}
          node={node}
          depth={0}
          connectionId={connectionId}
          repoFullName={repoFullName}
          branch={branch}
          onFileSelect={onFileSelect}
          selectedFile={selectedFile}
          loadedFiles={loadedFiles}
        />
      ))}
    </div>
  );
}
