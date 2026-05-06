"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Terminal, Play, RotateCcw, Loader2, CircleCheck, CircleAlert, ExternalLink, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HotSyncIndicator, type SyncStatus } from "@/components/HotSyncIndicator";

type PreviewStatus = "idle" | "booting" | "ready" | "error";

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
  /** Step 10: project ID used to fetch saved env vars before preview boot */
  projectId?: string;
  /** Step 9: hot-sync status passed from editor page */
  syncStatus?: SyncStatus;
  /** Step 9: file paths synced in the last hot-sync batch */
  lastSyncedFiles?: string[];
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
  onReady: (url: string, sandboxId?: string) => void,
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
        const payload = JSON.parse(dataRaw) as { message?: string; previewUrl?: string; sandboxId?: string };
        if (event === "log" && payload.message) onLog(payload.message);
        if (event === "ready" && payload.previewUrl) onReady(payload.previewUrl, payload.sandboxId);
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
  projectId,
  syncStatus = "idle",
  lastSyncedFiles = [],
}: LivePreviewProps) {
  const [e2bAvailable, setE2bAvailable] = useState<boolean | null>(null);
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState("");
  const [sandboxId, setSandboxId] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [iframeKey, setIframeKey] = useState(0);

  const previousEditedRef = useRef<Record<string, string>>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const didAutoReloadRef = useRef(false);

  const reloadIframe = useCallback(() => setIframeKey((k) => k + 1), []);

  // addLog must be declared before any effect that references it.
  const addLog = useCallback((line: string) => {
    const cleaned = stripAnsi(line);
    if (!cleaned) return;
    setLogs((prev) => [...prev.slice(-149), cleaned]);
  }, []);

  // Plain HTML projects (no package.json) don't support HMR — reload the iframe after sync.
  const isPlainHtmlProject = !workspaceFiles["package.json"] && !editedFiles["package.json"];

  useEffect(() => {
    if (status !== "ready" || !isPlainHtmlProject || syncStatus !== "done") return;
    const t = setTimeout(reloadIframe, 0);
    return () => clearTimeout(t);
  }, [syncStatus, isPlainHtmlProject, status, reloadIframe]);

  // The server-side already waits for a real HTTP 200/304/404 before sending "ready",
  // so no overlay or multi-reload dance is needed here. One small reload gives the
  // E2B tunnel edge nodes a moment to fully warm their cache.
  useEffect(() => {
    if (status !== "ready" || !previewUrl) return;
    if (didAutoReloadRef.current) return;
    const t = setTimeout(() => {
      didAutoReloadRef.current = true;
      reloadIframe();
    }, 1500);
    return () => clearTimeout(t);
  }, [status, previewUrl, reloadIframe]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/preview/config")
      .then((r) => r.json())
      .then((data: { e2bConfigured?: boolean }) => {
        if (cancelled) return;
        const ok = Boolean(data.e2bConfigured);
        setE2bAvailable(ok);
      })
      .catch(() => {
        if (cancelled) return;
        setE2bAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function fetchProjectEnvContent(): Promise<string> {
    if (!projectId) return "";
    try {
      const res = await fetch(`/api/projects/${projectId}/env-vars/dotenv`);
      if (!res.ok) return "";
      return await res.text();
    } catch {
      return "";
    }
  }

  async function startE2B() {
    setLogs([]);
    setPreviewUrl("");
    setSandboxId("");
    setErrorMessage("");
    setStatus("booting");
    didAutoReloadRef.current = false;
    previousEditedRef.current = { ...editedFiles };
    let sawReady = false;
    let sawError = false;

    const envContent = await fetchProjectEnvContent();
    const envOverlay: Record<string, string> = {};
    if (envContent.trim()) {
      envOverlay[".env"] = envContent;
      if ((workspaceFiles["package.json"] ?? editedFiles["package.json"])?.includes('"next"')) {
        envOverlay[".env.local"] = envContent;
      }
      addLog("🔐 Injecting project environment variables…");
    }

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
          overlayFiles: { ...envOverlay, ...editedFiles },
        },
        addLog,
        (url, readySandboxId) => {
          sawReady = true;
          setPreviewUrl(url);
          setSandboxId(readySandboxId ?? "");
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

  async function handleStartOrRestart() {
    await startE2B();
  }

  useEffect(() => {
    if (status !== "ready") return;

    const prev = previousEditedRef.current;
    const updates = Object.entries(editedFiles).filter(([path, content]) => prev[path] !== content);
    if (updates.length === 0) return;

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
        addLog("Synced — refreshing preview…");
        setTimeout(reloadIframe, 5000);
      })
      .catch(() => addLog("Hot update request failed."));

    previousEditedRef.current = { ...prev, ...editedFiles };
  }, [addLog, connectionId, editedFiles, previewKey, reloadIframe, status]);

  if (e2bAvailable === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
        Preparing preview…
      </div>
    );
  }

  const loadingMessage =
    status === "booting"
      ? "Cloning & installing in cloud…"
      : "";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Live Preview</span>
          <span className="text-xs text-slate-400">Cloud (E2B)</span>
          {status === "ready" && syncStatus === "idle" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
              <CircleCheck className="h-3.5 w-3.5" />
              Live
            </span>
          )}
          {status === "ready" && syncStatus !== "idle" && (
            <HotSyncIndicator status={syncStatus} lastSyncedFiles={lastSyncedFiles} />
          )}
          {status === "error" && (
            <span className="inline-flex max-w-55 truncate text-xs text-red-600" title={errorMessage}>
              <CircleAlert className="mr-1 h-3.5 w-3.5 shrink-0" />
              Failed
            </span>
          )}
          {status === "booting" && loadingMessage && <span className="text-xs text-amber-700">{loadingMessage}</span>}
        </div>

        <div className="flex items-center gap-2">
          {!e2bAvailable && (
            <span className="hidden text-xs text-slate-400 sm:inline">
              Missing E2B_API_KEY
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
          <Button size="sm" variant="outline" onClick={() => setShowLogs((prev) => !prev)} className="h-8 cursor-pointer gap-1">
            <Terminal className="h-3.5 w-3.5" />
            {showLogs ? "Hide logs" : "Logs"}
          </Button>

          {(status === "idle" || status === "error") && (
            <Button size="sm" onClick={handleStartOrRestart} className="h-8 cursor-pointer gap-1 bg-linear-to-r from-fuchsia-600 to-orange-400 text-white hover:opacity-95">
              <Play className="h-3.5 w-3.5" />
              Start
            </Button>
          )}

          {status === "ready" && (
            <>
              <Button size="sm" onClick={reloadIframe} variant="outline" className="h-8 cursor-pointer gap-1">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button size="sm" onClick={handleStartOrRestart} variant="secondary" className="h-8 cursor-pointer gap-1">
                <RotateCcw className="h-3.5 w-3.5" />
                Hard Restart
              </Button>
            </>
          )}

          {status === "booting" && (
            <Button size="sm" disabled className="h-8 gap-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Working
            </Button>
          )}
        </div>
      </div>

      {showLogs && (
        <div className="h-36 overflow-y-auto border-b border-slate-100 bg-slate-950 p-3 font-mono text-xs text-green-300">
          {logs.length === 0 ? (
            <p className="text-slate-400">Cloud preview clones your repo, installs deps, and streams logs here.</p>
          ) : (
            logs.map((line, idx) => <div key={`${idx}-${line.slice(0, 24)}`}>{line}</div>)
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 bg-slate-50">
        {status === "ready" && previewUrl ? (
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={
              `/api/preview/frame/${previewKey}/?previewUrl=${encodeURIComponent(previewUrl)}&sandboxId=${encodeURIComponent(
                sandboxId
              )}`
            }
            className="h-full w-full border-0"
            title="Live Preview"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-slate-500">
            {status === "booting" && (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                <p className="text-sm">{loadingMessage || "Working…"}</p>
                <p className="text-xs text-slate-400">First cloud run often takes 1–3 minutes.</p>
              </>
            )}

            {status === "idle" && (
              <>
                <p className="text-sm font-medium text-slate-700">
                  {e2bAvailable ? "Run the repo in a cloud sandbox" : "Cloud preview is not configured"}
                </p>
                <p className="max-w-sm text-xs text-slate-500">
                  Install: <code className="text-slate-700">{installCommand}</code> · Start:{" "}
                  <code className="text-slate-700">{startCommand}</code>
                </p>
                {!e2bAvailable && <p className="text-xs text-amber-700">Set `E2B_API_KEY` and refresh.</p>}
              </>
            )}

            {status === "error" && (
              <>
                <p className="text-sm font-medium text-red-600">Preview failed</p>
                <p className="max-w-md text-xs text-slate-600">{errorMessage}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
