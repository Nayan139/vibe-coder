# 🔧 VibeCode — Live Preview White Page Fix Guide

> **Problem:** Live preview (WebContainer) shows a white/blank page instead of the running app.
> **Root Cause:** Almost always one of 5 issues. Follow this guide top-to-bottom.

---

## 🚨 Quick Diagnosis Checklist

Before diving into fixes, check these in order:

- [ ] Are COOP/COEP headers set correctly in `next.config.js`?
- [ ] Is the WebContainer booting without errors? (Check browser console)
- [ ] Is the dev server actually starting? (Check the Logs panel in Live Preview)
- [ ] Is the iframe `src` being set to the correct WebContainer URL?
- [ ] Are there missing ENV variables causing the dev server to crash?

---

## ✅ Fix 1 — COOP/COEP Headers (Most Common Cause)

WebContainers **require** these two HTTP headers to be present on the page that loads them. Without them, the WebContainer API silently fails and the iframe stays blank.

### What to check

Open DevTools → Network tab → click your page → check Response Headers for:
```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

### The Fix — `next.config.js`

```javascript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        // Scope ONLY to the editor route to avoid breaking other pages
        source: '/dashboard/repo/:id/edit',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

> ⚠️ **Important:** Using `source: '/(.*)'` (all routes) can break Google Fonts, external images, and analytics. Scope to just the editor path.

### Vercel-specific note

If deployed on Vercel, also add to `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/dashboard/repo/(.*)/edit",
      "headers": [
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" }
      ]
    }
  ]
}
```

---

## ✅ Fix 2 — WebContainer Boot Timing

WebContainer must be booted **once** and reused. Calling `WebContainer.boot()` multiple times throws an error and the container never mounts.

### The Fix — `lib/webcontainer.ts`

```typescript
import { WebContainer } from '@webcontainer/api';

let instance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

// ✅ Singleton with promise-level deduplication
export async function getWebContainer(): Promise<WebContainer> {
  if (instance) return instance;
  
  // If a boot is already in-flight, wait for it instead of starting another
  if (!bootPromise) {
    bootPromise = WebContainer.boot().then((wc) => {
      instance = wc;
      return wc;
    });
  }
  
  return bootPromise;
}

export async function mountProjectFiles(
  files: Record<string, string>
): Promise<WebContainer> {
  const wc = await getWebContainer();
  const fsTree = buildFsTree(files);
  await wc.mount(fsTree);
  return wc;
}

function buildFsTree(files: Record<string, string>) {
  const tree: Record<string, any> = {};

  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/');
    let cur = tree;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) {
        cur[parts[i]] = { directory: {} };
      }
      cur = cur[parts[i]].directory;
    }

    cur[parts[parts.length - 1]] = {
      file: { contents: content },
    };
  }

  return tree;
}

export async function startDevServer(
  wc: WebContainer,
  installCmd: string,
  startCmd: string,
  onReady: (url: string) => void,
  onLog: (line: string) => void
): Promise<void> {
  // Step 1: Install
  const [installBin, ...installArgs] = installCmd.split(' ');
  const installProcess = await wc.spawn(installBin, installArgs);
  installProcess.output.pipeTo(
    new WritableStream({ write: (chunk) => onLog(chunk) })
  );
  const installExit = await installProcess.exit;
  if (installExit !== 0) {
    throw new Error(`Install failed with exit code ${installExit}`);
  }

  // Step 2: Start dev server
  const [startBin, ...startArgs] = startCmd.split(' ');
  const serverProcess = await wc.spawn(startBin, startArgs);
  serverProcess.output.pipeTo(
    new WritableStream({ write: (chunk) => onLog(chunk) })
  );

  // Step 3: Wait for server-ready event
  wc.on('server-ready', (port, url) => {
    onLog(`✅ Server ready on port ${port}: ${url}`);
    onReady(url);
  });
}
```

---

## ✅ Fix 3 — Iframe URL Not Being Set

The iframe shows white if `previewUrl` is empty or set before the server is actually ready.

### Debug — add this log

```typescript
wc.on('server-ready', (port, url) => {
  console.log('🎯 server-ready fired:', { port, url }); // Add this
  setPreviewUrl(url);
  setStatus('ready');
});
```

If you never see `server-ready fired` in the console, the dev server is crashing before it binds to a port — check the Logs panel for errors.

### The Fix — `components/LivePreview.tsx` (complete, corrected)

```typescript
'use client';
import { useState, useEffect, useRef } from 'react';
import { mountProjectFiles, startDevServer } from '@/lib/webcontainer';

type Status = 'idle' | 'mounting' | 'installing' | 'starting' | 'ready' | 'error';

interface LivePreviewProps {
  allFiles: Record<string, string>;
  changedFiles: Record<string, string>;
  installCommand: string;
  startCommand: string;
}

export function LivePreview({
  allFiles,
  changedFiles,
  installCommand,
  startCommand,
}: LivePreviewProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [previewUrl, setPreviewUrl] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const addLog = (line: string) =>
    setLogs((prev) => [...prev.slice(-200), line]);

  async function startPreview() {
    try {
      setPreviewUrl(''); // Reset URL on each start attempt
      setStatus('mounting');
      addLog('📦 Mounting project files into WebContainer...');

      const merged = { ...allFiles, ...changedFiles };
      const wc = await mountProjectFiles(merged);

      setStatus('installing');
      addLog(`⬇️ Running: ${installCommand}`);

      await startDevServer(
        wc,
        installCommand,
        startCommand,
        (url) => {
          setPreviewUrl(url);
          setStatus('ready');
          addLog(`✅ Preview ready: ${url}`);
        },
        (line) => addLog(line)
      );

      setStatus('starting');
      addLog(`🚀 Running: ${startCommand}`);
    } catch (err: any) {
      setStatus('error');
      addLog(`❌ Error: ${err?.message || err}`);
      console.error('WebContainer error:', err);
    }
  }

  const isLoading = ['mounting', 'installing', 'starting'].includes(status);

  return (
    <div className="flex flex-col h-full border rounded-xl overflow-hidden bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 shrink-0">
        <span className="text-sm text-gray-300 font-medium">🖥️ Live Preview</span>
        <div className="flex items-center gap-2">
          {status === 'ready' && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Live
            </span>
          )}
          <button
            onClick={() => setShowLogs((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded bg-gray-700"
          >
            {showLogs ? 'Hide Logs' : 'Show Logs'}
          </button>
          {(status === 'idle' || status === 'error') && (
            <button
              onClick={startPreview}
              className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            >
              ▶ Start
            </button>
          )}
          {status === 'ready' && (
            <button
              onClick={startPreview}
              className="text-xs bg-gray-600 text-gray-300 px-3 py-1 rounded hover:bg-gray-500"
            >
              ↺ Restart
            </button>
          )}
          {isLoading && (
            <span className="text-xs text-yellow-400">
              {status === 'mounting' && '📦 Mounting...'}
              {status === 'installing' && '⬇️ Installing deps...'}
              {status === 'starting' && '🚀 Starting server...'}
            </span>
          )}
        </div>
      </div>

      {/* Terminal Logs */}
      {showLogs && (
        <div className="bg-black text-green-400 font-mono text-xs p-3 h-40 overflow-y-auto shrink-0 border-t border-gray-700">
          {logs.length === 0 ? (
            <span className="text-gray-600">No logs yet — start the preview.</span>
          ) : (
            logs.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-words">
                {line}
              </div>
            ))
          )}
        </div>
      )}

      {/* Preview Area */}
      <div className="flex-1 relative bg-white">
        {/* Iframe — always rendered, hidden until ready */}
        <iframe
          ref={iframeRef}
          src={previewUrl || 'about:blank'}
          className="absolute inset-0 w-full h-full border-0"
          title="Live Preview"
          style={{ display: status === 'ready' && previewUrl ? 'block' : 'none' }}
          allow="cross-origin-isolated"
        />

        {/* Overlay states */}
        {status !== 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-3 bg-gray-50">
            {status === 'idle' && (
              <>
                <span className="text-5xl">🖥️</span>
                <p className="text-sm font-medium text-gray-600">
                  Click "Start" to boot the project
                </p>
                <p className="text-xs text-gray-400">
                  Powered by WebContainers — runs entirely in your browser
                </p>
              </>
            )}
            {status === 'error' && (
              <>
                <span className="text-5xl">❌</span>
                <p className="text-sm font-medium text-red-500">
                  Preview failed to start
                </p>
                <p className="text-xs text-gray-500">
                  Check logs above for error details
                </p>
                <button
                  onClick={startPreview}
                  className="mt-2 text-xs bg-red-500 text-white px-4 py-1.5 rounded-lg"
                >
                  Try Again
                </button>
              </>
            )}
            {isLoading && (
              <>
                <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-gray-600">
                  {status === 'mounting' && 'Mounting project files...'}
                  {status === 'installing' &&
                    'Installing dependencies — this can take 1–2 minutes...'}
                  {status === 'starting' && 'Starting dev server...'}
                </p>
                <p className="text-xs text-gray-400">
                  Show logs to see real-time output
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## ✅ Fix 4 — Dev Server Not Binding to Correct Port

WebContainers intercept network calls. The dev server **must** bind to `0.0.0.0` (not `localhost` or `127.0.0.1`) for the `server-ready` event to fire correctly.

### For Vite projects — add `vite.config.ts`

```typescript
// vite.config.ts — inject this via WebContainer before boot
export default {
  server: {
    host: '0.0.0.0', // ← Required for WebContainer
    port: 5173,
  },
};
```

Or pass as a flag in the start command:
```
vite --host 0.0.0.0
```

### For Next.js projects

```json
// package.json dev script
"scripts": {
  "dev": "next dev -H 0.0.0.0 -p 3000"
}
```

### Detect and Patch Automatically

Before mounting files, patch the start command if needed:

```typescript
function normalizeStartCommand(cmd: string, files: Record<string, string>): string {
  const hasVite = files['package.json']?.includes('"vite"');
  const hasNext = files['package.json']?.includes('"next"');

  if (hasVite && !cmd.includes('--host')) {
    return cmd + ' --host 0.0.0.0';
  }
  if (hasNext && !cmd.includes('-H')) {
    return cmd.replace('next dev', 'next dev -H 0.0.0.0');
  }

  return cmd;
}

// Use in startPreview:
const patchedStartCmd = normalizeStartCommand(startCommand, merged);
await startDevServer(wc, installCommand, patchedStartCmd, onReady, addLog);
```

---

## ✅ Fix 5 — Missing or Incomplete Files Mounted

If the file tree sent to WebContainer is missing `package.json` or `node_modules` isn't built (because install failed), the dev server won't start.

### Debug — log what files are being mounted

```typescript
async function startPreview() {
  const merged = { ...allFiles, ...changedFiles };
  
  // Add this debug log:
  console.log('🗂️ Mounting files:', Object.keys(merged));
  console.log('📦 Has package.json:', !!merged['package.json']);
  
  const wc = await mountProjectFiles(merged);
  // ...
}
```

### Common causes and fixes

| Symptom in logs | Likely cause | Fix |
|---|---|---|
| `sh: npm: not found` | npm not available | Change install command to use `npx` or try `yarn` |
| `Cannot find module 'xyz'` | Install failed silently | Check install exit code; open logs panel |
| `Error: listen EADDRINUSE` | Port already taken | Restart WebContainer (call `WebContainer.boot()` fresh) |
| `ENOENT package.json` | Root path mismatch | Verify files are keyed from repo root, not subdirectory |
| Blank logs, no server-ready | COOP/COEP missing | See Fix 1 |

### Ensure files are fetched before mounting

```typescript
// In your editor page — ensure all baseline files are loaded before enabling "Start"
const [filesLoaded, setFilesLoaded] = useState(false);

useEffect(() => {
  async function loadFiles() {
    const files = await fetchAllRepoFiles(projectId);
    setBaselineFiles(files);
    setFilesLoaded(true);
  }
  loadFiles();
}, [projectId]);

// Disable Start button until files are loaded:
<button
  onClick={startPreview}
  disabled={!filesLoaded}
  className="..."
>
  {filesLoaded ? '▶ Start' : '⏳ Loading files...'}
</button>
```

---

## ✅ Fix 6 — WebContainer Not Supported in Browser

WebContainers only work in **Chromium-based browsers** (Chrome, Edge, Brave). They do not work in Firefox or Safari.

Add a browser compatibility check:

```typescript
// components/LivePreview.tsx — add at top of component
function isWebContainerSupported(): boolean {
  // Requires SharedArrayBuffer which needs COOP/COEP
  return typeof SharedArrayBuffer !== 'undefined';
}

// In render:
if (!isWebContainerSupported()) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 p-6">
      <span className="text-4xl">⚠️</span>
      <p className="text-sm font-medium text-gray-700 text-center">
        Live Preview requires a Chromium-based browser
      </p>
      <p className="text-xs text-center">
        Please use Chrome, Edge, or Brave. Firefox and Safari are not supported.
      </p>
    </div>
  );
}
```

> If `SharedArrayBuffer` is `undefined` even in Chrome, it means the COOP/COEP headers are still missing (see Fix 1).

---

## 🔍 Full Debug Checklist

Run through these in order when the preview shows a white page:

```
1. Open browser DevTools → Console
   → Any errors? "SharedArrayBuffer is not defined"? → Fix 1 (headers)
   → "Cannot call boot() more than once"? → Fix 2 (singleton)

2. Click "Show Logs" in the Live Preview panel
   → Empty logs? → WebContainer failed to boot (Fix 1 or Fix 6)
   → "npm: not found"? → Try 'npx npm install' as install command
   → "EADDRINUSE"? → Hard refresh page to reset WebContainer
   → Install finishes but no server-ready? → Fix 4 (host binding)

3. Check browser DevTools → Network tab
   → Look for the page response headers
   → Must have COEP: require-corp and COOP: same-origin

4. Check the iframe src
   → DevTools → Elements → find <iframe>
   → src should be something like https://xxxx.webcontainer.io
   → If src is "about:blank" → server-ready never fired (Fix 4)

5. Try a minimal test repo
   → Use a plain Vite React app: npm create vite@latest
   → If that works but your repo doesn't → issue is with your repo's setup
```

---

## 🛠️ Complete Working Integration Example

Here is the minimal working integration for the editor page:

```typescript
// app/dashboard/repo/[id]/edit/page.tsx (simplified)
'use client';
import { useState, useEffect } from 'react';
import { LivePreview } from '@/components/LivePreview';

export default function EditorPage({ params }: { params: { id: string } }) {
  const [baselineFiles, setBaselineFiles] = useState<Record<string, string>>({});
  const [accumulatedChanges, setAccumulatedChanges] = useState<Record<string, string>>({});
  const [installCommand, setInstallCommand] = useState('npm install');
  const [startCommand, setStartCommand] = useState('npm run dev');
  const [filesLoaded, setFilesLoaded] = useState(false);

  // Load all project files from GitHub on mount
  useEffect(() => {
    async function loadProject() {
      const res = await fetch(`/api/git/files?projectId=${params.id}&all=true`);
      const { files } = await res.json();
      setBaselineFiles(files); // { 'src/App.tsx': '...', 'package.json': '...' }
      setFilesLoaded(true);
    }
    loadProject();
  }, [params.id]);

  return (
    <div className="grid grid-cols-[260px_1fr_1fr] h-screen">
      {/* File Tree */}
      <aside>...</aside>

      {/* Chat Panel */}
      <main>...</main>

      {/* Right Panel — Diff + Live Preview tabs */}
      <aside>
        {filesLoaded ? (
          <LivePreview
            allFiles={baselineFiles}
            changedFiles={accumulatedChanges}
            installCommand={installCommand}
            startCommand={startCommand}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Loading project files...
          </div>
        )}
      </aside>
    </div>
  );
}
```

---

## 📋 Summary — Priority Order to Fix

| Priority | Fix | Time to implement |
|---|---|---|
| 🔴 #1 | Add COOP/COEP headers to `next.config.js` AND `vercel.json` | 5 minutes |
| 🔴 #2 | Fix WebContainer singleton (prevent double-boot) | 10 minutes |
| 🔴 #3 | Add `--host 0.0.0.0` to dev server command | 5 minutes |
| 🟡 #4 | Add browser compatibility check (`SharedArrayBuffer`) | 5 minutes |
| 🟡 #5 | Verify files are loaded before mounting | 10 minutes |
| 🟢 #6 | Add file mount debug logging | 5 minutes |

**Most likely cause of white page:** Missing COOP/COEP headers on Vercel (Fix 1) + dev server not binding to `0.0.0.0` (Fix 4). Fix those two first.

---

*VibeCode Phase 5 — Live Preview Debug Guide*
*Stack: Next.js 14 + WebContainers API + Vercel*