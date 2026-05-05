"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Terminal, Play, RotateCcw, Loader2, CircleCheck, CircleAlert, ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mountProjectFiles, startDevServer, teardownWebContainer, updateFileInContainer } from "@/lib/webcontainer";

type PreviewEngine = "e2b" | "webcontainer";

type E2bStatus = "idle" | "booting" | "ready" | "error";
type WcPreviewStatus = "idle" | "mounting" | "installing" | "starting" | "ready" | "error";

type PreviewStatus = E2bStatus | WcPreviewStatus;

interface LivePreviewProps {
  previewKey: string;
  connectionId: string;
  repoFullName: string;
  branch: string;
  provider: string;
  /** Broad file context for in-browser WebContainer mount (may be partial). */
  workspaceFiles: Record<string, string>;
  /** Accumulated + in-review AI edits — overlaid on E2B clone and hot-pushed while preview runs. */
  editedFiles: Record<string, string>;
  installCommand: string;
  startCommand: string;
  repoTreePaths?: string[];
}

function isSimpleProject(packageJson: string | undefined): boolean {
  if (!packageJson) return false;
  try {
    const pkg = JSON.parse(packageJson) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const n = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).length;
    return n < 15;
  } catch {
    return false;
  }
}

function stripAnsi(line: string): string {
  return line
    .replace(/\u001b\[[0-9;]*[A-Za-z]/g, "")
    .replace(/\r/g, "")
    .trimEnd();
}

async function consumeE2BPreviewStream(
  body: Record<string, unknown>,
  onLog: (line: string) => void,
  onReady: (url: string) => void,
  onError: (message: string) => void
) {
  const res = await fetch("/api/preview/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errJson = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errJson.error || `Preview failed (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body from preview stream.");

  const decoder = new TextDecoder();
  let buffer = "";

  const processEvents = (chunk: string) => {
    buffer += chunk;
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const lines = part.split("\n").filter(Boolean);
      let event = "message";
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      const dataRaw = dataLines.join("");
      if (!dataRaw) continue;
      try {
        const payload = JSON.parse(dataRaw) as { message?: string; previewUrl?: string };
        if (event === "log" && payload.message) onLog(payload.message);
        if (event === "ready" && payload.previewUrl) onReady(payload.previewUrl);
        if (event === "error") onError(payload.message || "Preview error");
      } catch {
        onLog(dataRaw);
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    processEvents(decoder.decode(value, { stream: true }));
  }
  processEvents(decoder.decode());
}

export function LivePreview({
  previewKey,
  connectionId,
  repoFullName,
  branch,
  provider,
  workspaceFiles,
  editedFiles,
  installCommand,
  startCommand,
  repoTreePaths = [],
}: LivePreviewProps) {
  const [engine, setEngine] = useState<PreviewEngine | null>(null);
  const [e2bAvailable, setE2bAvailable] = useState<boolean | null>(null);

  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const previousEditedRef = useRef<Record<string, string>>({});

  const mergedForWebContainer = useMemo(
    () => ({ ...workspaceFiles, ...editedFiles }),
    [workspaceFiles, editedFiles]
  );

  const pkgJson = workspaceFiles["package.json"] ?? editedFiles["package.json"];
  const simple = isSimpleProject(pkgJson);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/preview/config")
      .then((r) => r.json())
      .then((data: { e2bConfigured?: boolean }) => {
        if (cancelled) return;
        const ok = Boolean(data.e2bConfigured);
        setE2bAvailable(ok);
        if (ok) setEngine("e2b");
        else setEngine("webcontainer");
      })
      .catch(() => {
        if (cancelled) return;
        setE2bAvailable(false);
        setEngine("webcontainer");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addLog = useCallback((line: string) => {
    const cleaned = stripAnsi(line);
    if (!cleaned) return;
    setLogs((prev) => [...prev.slice(-149), cleaned]);
  }, []);

  async function startE2B() {
    setLogs([]);
    setPreviewUrl("");
    setErrorMessage("");
    setStatus("booting");
    previousEditedRef.current = { ...editedFiles };
    let sawReady = false;
    let sawError = false;

    try {
      await consumeE2BPreviewStream(
        {
          previewKey,
          connectionId,
          repoFullName,
          branch,
          provider,
          installCommand,
          startCommand,
          overlayFiles: editedFiles,
        },
        addLog,
        (url) => {
          sawReady = true;
          setPreviewUrl(url);
          setStatus("ready");
          addLog(`Ready: ${url}`);
        },
        (msg) => {
          sawError = true;
          setErrorMessage(msg);
          setStatus("error");
        }
      );
      if (!sawReady && !sawError) {
        setErrorMessage("Stream ended before the preview became ready.");
        setStatus("error");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Preview failed.";
      setErrorMessage(msg);
      setStatus("error");
      addLog(`Error: ${msg}`);
    }
  }

  async function startWebContainer() {
    try {
      setLogs([]);
      setPreviewUrl("");
      setStatus("mounting");
      addLog("Mounting project files in the browser…");
      const wc = await mountProjectFiles(mergedForWebContainer);

      addLog(`Installing: ${installCommand}`);
      addLog(`Starting: ${startCommand}`);

      await startDevServer(
        wc,
        installCommand,
        startCommand,
        Object.keys(mergedForWebContainer),
        repoTreePaths,
        (url) => {
          setPreviewUrl(url);
          setStatus("ready");
          addLog(`Server ready at ${url}`);
        },
        (line) => addLog(line),
        (phase) => setStatus(phase)
      );
      previousEditedRef.current = { ...editedFiles };
    } catch (error) {
      setStatus("error");
      const message = error instanceof Error ? error.message : "Failed to start preview.";
      setErrorMessage(message);
      addLog(`Error: ${message}`);
      if (message.includes("instance limit")) {
        addLog("Attempting one-time WebContainer reset…");
        teardownWebContainer();
      }
    }
  }

  async function handleStartOrRestart() {
    if (engine === "e2b") {
      await startE2B();
      return;
    }
    await startWebContainer();
  }

  useEffect(() => {
    if (status !== "ready" || engine === null) return;

    const prev = previousEditedRef.current;
    const updates = Object.entries(editedFiles).filter(([path, content]) => prev[path] !== content);
    if (updates.length === 0) return;

    if (engine === "e2b") {
      void fetch("/api/preview/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previewKey,
          connectionId,
          changes: Object.fromEntries(updates),
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const j = (await res.json().catch(() => ({}))) as { error?: string };
            addLog(`Hot update failed: ${j.error ?? res.status}`);
            return;
          }
          for (const [path] of updates) addLog(`Pushed ${path} to cloud preview`);
        })
        .catch(() => addLog("Hot update request failed."));
    } else {
      void Promise.all(
        updates.map(async ([path, content]) => {
          await updateFileInContainer(path, content);
          addLog(`Hot updated ${path}`);
        })
      );
    }

    previousEditedRef.current = { ...prev, ...editedFiles };
  }, [addLog, connectionId, editedFiles, engine, previewKey, status]);

  const canToggleEngine = e2bAvailable === true && simple;

  if (engine === null || e2bAvailable === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
        Preparing preview…
      </div>
    );
  }

  const loadingMessage =
    status === "booting"
      ? engine === "e2b"
        ? "Cloning & installing in cloud…"
        : "Working…"
      : status === "mounting"
        ? "Mounting files…"
        : status === "installing"
          ? "Installing dependencies…"
          : status === "starting"
            ? "Starting dev server…"
            : "";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Live Preview</span>
          {e2bAvailable && (
            <span className="text-xs text-gray-400">
              {engine === "e2b" ? "Cloud (E2B)" : "Browser"}
            </span>
          )}
          {canToggleEngine && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setEngine((e) => (e === "e2b" ? "webcontainer" : "e2b"))}
            >
              Use {engine === "e2b" ? "browser" : "cloud"}
            </Button>
          )}
          {status === "ready" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
              <CircleCheck className="h-3.5 w-3.5" />
              Live
            </span>
          )}
          {status === "error" && (
            <span className="inline-flex max-w-[220px] truncate text-xs text-red-600" title={errorMessage}>
              <CircleAlert className="mr-1 h-3.5 w-3.5 shrink-0" />
              Failed
            </span>
          )}
          {(status === "booting" || status === "mounting" || status === "installing" || status === "starting") &&
            loadingMessage && (
              <span className="text-xs text-amber-700">{loadingMessage}</span>
            )}
        </div>

        <div className="flex items-center gap-2">
          {!e2bAvailable && (
            <span className="hidden text-xs text-gray-400 sm:inline">
              Add E2B_API_KEY for cloud preview
            </span>
          )}
          {status === "ready" && previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </a>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => setShowLogs((prev) => !prev)} className="h-8 gap-1">
            <Terminal className="h-3.5 w-3.5" />
            {showLogs ? "Hide logs" : "Logs"}
          </Button>

          {(status === "idle" || status === "error") && (
            <Button size="sm" onClick={handleStartOrRestart} className="h-8 gap-1">
              <Play className="h-3.5 w-3.5" />
              Start
            </Button>
          )}

          {status === "ready" && (
            <Button size="sm" onClick={handleStartOrRestart} variant="secondary" className="h-8 gap-1">
              <RotateCcw className="h-3.5 w-3.5" />
              Restart
            </Button>
          )}

          {(status === "booting" || status === "mounting" || status === "installing" || status === "starting") && (
            <Button size="sm" disabled className="h-8 gap-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Working
            </Button>
          )}
        </div>
      </div>

      {showLogs && (
        <div className="h-36 overflow-y-auto border-b border-gray-100 bg-slate-950 p-3 font-mono text-xs text-green-300">
          {logs.length === 0 ? (
            <p className="text-slate-400">
              {engine === "e2b"
                ? "Cloud preview clones your repo, installs deps, and streams logs here."
                : "Logs appear after you start browser preview."}
            </p>
          ) : (
            logs.map((line, idx) => <div key={`${idx}-${line.slice(0, 24)}`}>{line}</div>)
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 bg-gray-50">
        {status === "ready" && previewUrl ? (
          <iframe src={previewUrl} className="h-full w-full border-0" title="Live Preview" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-gray-500">
            {(status === "booting" || status === "mounting" || status === "installing" || status === "starting") && (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                <p className="text-sm">{loadingMessage || "Working…"}</p>
                {(status === "booting" || status === "installing") && engine === "e2b" && (
                  <p className="text-xs text-gray-400">First cloud run often takes 1–3 minutes.</p>
                )}
              </>
            )}

            {status === "idle" && (
              <>
                <p className="text-sm font-medium text-gray-700">
                  {engine === "e2b" ? "Run the repo in a cloud sandbox" : "Run the project in your browser"}
                </p>
                <p className="max-w-sm text-xs text-gray-500">
                  Install: <code className="text-gray-700">{installCommand}</code> · Start:{" "}
                  <code className="text-gray-700">{startCommand}</code>
                </p>
                {!e2bAvailable && (
                  <p className="text-xs text-amber-700">
                    Web Preview uses WebContainers (headers/COOP). For fewer issues, add E2B_API_KEY.
                  </p>
                )}
              </>
            )}

            {status === "error" && (
              <>
                <p className="text-sm font-medium text-red-600">Preview failed</p>
                <p className="max-w-md text-xs text-gray-600">{errorMessage}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
