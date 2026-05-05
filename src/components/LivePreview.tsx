"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Terminal, Play, RotateCcw, Loader2, CircleCheck, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mountProjectFiles, startDevServer, teardownWebContainer, updateFileInContainer } from "@/lib/webcontainer";

type PreviewStatus = "idle" | "mounting" | "installing" | "starting" | "ready" | "error";

interface LivePreviewProps {
  allFiles: Record<string, string>;
  changedFiles: Record<string, string>;
  installCommand: string;
  startCommand: string;
  repoTreePaths?: string[];
}

export function LivePreview({
  allFiles,
  changedFiles,
  installCommand,
  startCommand,
  repoTreePaths = [],
}: LivePreviewProps) {
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const previousFilesRef = useRef<Record<string, string>>({});

  const mergedFiles = useMemo(() => ({ ...allFiles, ...changedFiles }), [allFiles, changedFiles]);

  const addLog = (line: string) => {
    // Strip ANSI escape sequences so terminal output is readable in UI logs.
    const cleaned = line
      .replace(/\u001b\[[0-9;]*[A-Za-z]/g, "")
      .replace(/\r/g, "")
      .trimEnd();
    if (!cleaned) return;
    setLogs((prev) => [...prev.slice(-149), cleaned]);
  };

  async function handleStartOrRestart() {
    try {
      setLogs([]);
      setPreviewUrl("");
      setStatus("mounting");
      addLog("Mounting project files...");
      const wc = await mountProjectFiles(mergedFiles);

      addLog(`Installing dependencies: ${installCommand}`);
      addLog(`Starting dev server: ${startCommand}`);

      await startDevServer(
        wc,
        installCommand,
        startCommand,
        Object.keys(mergedFiles),
        repoTreePaths,
        (url) => {
          setPreviewUrl(url);
          setStatus("ready");
          addLog(`Server ready at ${url}`);
        },
        (line) => addLog(line),
        (phase) => setStatus(phase)
      );
      previousFilesRef.current = { ...mergedFiles };
    } catch (error) {
      setStatus("error");
      const message = error instanceof Error ? error.message : "Failed to start preview.";
      addLog(`Error: ${message}`);
      if (message.includes("instance limit")) {
        addLog("Attempting one-time WebContainer reset...");
        teardownWebContainer();
      }
    }
  }

  useEffect(() => {
    if (status !== "ready") return;

    const previous = previousFilesRef.current;
    const updates = Object.entries(changedFiles).filter(([path, content]) => previous[path] !== content);
    if (updates.length === 0) return;

    void Promise.all(
      updates.map(async ([path, content]) => {
        await updateFileInContainer(path, content);
        addLog(`Hot updated ${path}`);
      })
    );

    previousFilesRef.current = { ...previous, ...changedFiles };
  }, [changedFiles, status]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Live Preview</span>
          {status === "ready" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
              <CircleCheck className="h-3.5 w-3.5" />
              Live
            </span>
          )}
          {status === "error" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
              <CircleAlert className="h-3.5 w-3.5" />
              Error
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowLogs((prev) => !prev)}>
            <Terminal className="h-4 w-4" />
            {showLogs ? "Hide Logs" : "Logs"}
          </Button>

          {(status === "idle" || status === "error") && (
            <Button size="sm" onClick={handleStartOrRestart} className="gap-1.5">
              <Play className="h-4 w-4" />
              Start
            </Button>
          )}

          {status === "ready" && (
            <Button size="sm" onClick={handleStartOrRestart} variant="secondary" className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              Restart
            </Button>
          )}
        </div>
      </div>

      {showLogs && (
        <div className="h-36 overflow-y-auto border-b border-gray-100 bg-slate-950 p-3 font-mono text-xs text-green-300">
          {logs.length === 0 ? (
            <p className="text-slate-400">Logs appear here after you start preview.</p>
          ) : (
            logs.map((line, idx) => <div key={`${idx}-${line.slice(0, 20)}`}>{line}</div>)
          )}
        </div>
      )}

      <div className="flex-1 bg-gray-50">
        {status === "ready" && previewUrl ? (
          <iframe src={previewUrl} className="h-full w-full border-0" title="Live Preview" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-gray-500">
            {(status === "mounting" || status === "installing" || status === "starting") && (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                <p className="text-sm">
                  {status === "mounting" && "Mounting files..."}
                  {status === "installing" && "Installing dependencies..."}
                  {status === "starting" && "Starting dev server..."}
                </p>
              </>
            )}

            {status === "idle" && (
              <>
                <p className="text-sm font-medium text-gray-700">Run this project in-browser</p>
                <p className="text-xs text-gray-500">
                  Uses install command <code>{installCommand}</code> and start command <code>{startCommand}</code>.
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <p className="text-sm font-medium text-red-600">Preview failed</p>
                <p className="text-xs text-gray-500">Check logs and restart preview.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
