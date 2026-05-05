# 🖥️ Live Preview — Research & Decision Document
## VibeCode: Running User Projects for Local Preview

> **Problem:** We need to install dependencies and run a user's project so they can see live changes after AI edits — in milliseconds if possible.
> **Decision Date:** Phase 5
> **Status:** Research Complete → Decision Made

---

## Why WebContainers Alone Don't Work Well Enough

Before picking a solution, here's exactly why the vanilla WebContainer approach from Phase 5 Step 5 breaks in practice:

### The Real Problems

```
Problem 1 — npm install is NOT fast
  WebContainer boots in ~1-2 seconds.
  npm install for a real project (React, Next.js, Vue) = 2 to 5 MINUTES.
  User sees a spinner for 3 minutes before anything works.
  This is completely unusable for a demo or real product.

Problem 2 — COOP/COEP headers break everything else
  To use WebContainers you MUST serve your entire app with:
    Cross-Origin-Embedder-Policy: require-corp
    Cross-Origin-Opener-Policy: same-origin
  This breaks:
    - Supabase Auth (uses postMessage across origins)
    - GitHub/GitLab OAuth redirects
    - Any third-party iframe or script
    - Google Fonts, CDN assets
  You cannot scope these headers to just one route in Next.js easily.

Problem 3 — Browser restrictions
  Requires SharedArrayBuffer.
  Blocked by default in Firefox Private Mode, Brave, some Safari versions.
  Third-party cookie restrictions in Chrome 118+ can break it.
  Non-developers using VibeCode won't know how to fix this.

Problem 4 — Large projects exceed memory
  Real repos with many dependencies can exceed the browser's memory limit.
  On mobile devices this is almost guaranteed to fail.

Problem 5 — Only works for Node.js / JavaScript projects
  WebContainers only runs Node.js.
  If the user's repo is Python, Ruby, Go, PHP — it simply cannot run it.
```

---

## The Three Real Options

### Option A — WebContainers with Smart Caching (In-Browser)
**What:** Use WebContainers but cache `node_modules` in IndexedDB between sessions so install only runs once per repo.

**Pros:**
- Fully client-side, no server cost
- Works offline after first install
- StackBlitz's own product (well-maintained)

**Cons:**
- First install still takes 2–5 minutes
- COOP/COEP headers still required and still break other things
- Only Node.js projects
- Memory limits on large repos

**Verdict:** ✅ Good for demos of small projects. ❌ Not production-ready for arbitrary user repos.

---

### Option B — E2B Cloud Sandbox (Server-Side, Recommended ✅)
**What:** E2B spins up a real Firecracker microVM (Linux) in ~150ms. You clone the repo, install deps, start the dev server, and tunnel the running port to a preview URL. All server-side.

**How it works:**
```
User clicks "Start Preview"
      ↓
Your Next.js API route calls E2B SDK
      ↓
E2B boots a Linux microVM in ~150ms
      ↓
Your code: git clone repo, cp .env file, npm install, npm run dev
      ↓
E2B exposes a tunnel URL for the running port
      ↓
You embed that URL in an iframe → user sees live app ✅
      ↓
AI makes changes → you write files into the sandbox → HMR reloads iframe
```

**Pros:**
- Real Linux environment — works for Node.js, Python, Ruby, Go, any language
- npm install runs at real server speed (30–60 seconds for most projects)
- No COOP/COEP header issues — the iframe just loads a URL
- No browser memory limits
- Persistent sandbox per session — AI can keep writing files and HMR reloads
- Free tier: $100 credit, no credit card needed to start

**Cons:**
- Requires internet (not offline)
- npm install still takes 30–90 seconds first time
- Session limit: 1 hour on free tier, 24 hours on Pro
- Costs money at scale (~$0.05/hour per sandbox)

**Verdict:** ✅ Best choice for real-world use. Production-ready. Works for any project type.

---

### Option C — Daytona Cloud Sandbox (Server-Side, Fastest Start)
**What:** Similar to E2B but uses Docker containers instead of microVMs. Claims sub-90ms cold starts from a warm pool.

**Pros:**
- Fastest cold starts (~90ms from warm pool)
- Persistent sandboxes — files survive across sessions
- Docker-based — easy to use any language/framework
- Open source (self-hostable)

**Cons:**
- Less security isolation (containers share host kernel, unlike E2B's microVMs)
- Platform is newer and less mature than E2B
- More complex setup

**Verdict:** ✅ Good alternative to E2B if you want persistence. Slightly less mature.

---

## Decision: Use a Hybrid Approach

```
┌────────────────────────────────────────────────────────────────┐
│  STRATEGY: WebContainers for small/simple + E2B for full run   │
│                                                                │
│  Phase A — Diff Preview (already working ✅)                  │
│    Show code diff immediately — no install needed             │
│    User can see WHAT changed without running anything         │
│                                                                │
│  Phase B — Quick Preview (WebContainers, for simple projects) │
│    If project is simple (Vite, CRA, <50 deps)                 │
│    Use WebContainers with IndexedDB node_modules cache        │
│    First install: ~2 min | Subsequent: ~5 seconds             │
│                                                                │
│  Phase C — Full Preview (E2B, for real projects)              │
│    For any project: install + run in real Linux VM            │
│    First start: ~60-90 seconds total                          │
│    AI file updates: instant (HMR)                             │
│    This is what Bolt.new, Cursor, and v0 all use internally   │
└────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan — E2B (Recommended Path)

### Step 1 — Install E2B SDK

```bash
npm install e2b
```

Get your API key from: https://e2b.dev → Dashboard → API Keys

Add to `.env.local`:
```env
E2B_API_KEY=your_e2b_api_key_here
```

Add to `.env.sample`:
```env
# ── E2B SANDBOX (Live Preview) ────────────────────────────────────────────────
# Get from: https://e2b.dev/dashboard
# Free tier: $100 credit, no credit card needed
# Used for: spinning up a real Linux VM to run the user's project live
E2B_API_KEY=your_e2b_api_key_here
```

---

### Step 2 — API Route: Start Sandbox

#### `app/api/preview/start/route.ts`

```typescript
import { Sandbox } from 'e2b';

// Store active sandboxes in memory (use Redis for production)
const activeSandboxes = new Map<string, { sandbox: Sandbox; previewUrl: string }>();

export async function POST(request: Request) {
  const {
    sessionId,
    repoFullName,
    branch,
    accessToken,
    installCommand = 'npm install',
    startCommand = 'npm run dev',
    envVars = {},            // user's filled-in .env values
    provider = 'github',
  } = await request.json();

  try {
    // Boot E2B sandbox — takes ~150ms
    const sandbox = await Sandbox.create({
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: 60 * 60 * 1000, // 1 hour session
    });

    const sandboxId = sandbox.sandboxId;

    // Stream logs back via SSE (see Step 3)
    // For now, run everything and return when ready

    // 1. Clone the repo
    const gitUrl = provider === 'github'
      ? `https://oauth2:${accessToken}@github.com/${repoFullName}.git`
      : `https://oauth2:${accessToken}@gitlab.com/${repoFullName}.git`;

    await sandbox.commands.run(
      `git clone --depth 1 --branch ${branch} ${gitUrl} /app`,
      { timeoutMs: 60_000 }
    );

    // 2. Write .env file if user provided values
    if (Object.keys(envVars).length > 0) {
      const envContent = Object.entries(envVars)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
      await sandbox.files.write('/app/.env', envContent);
      await sandbox.files.write('/app/.env.local', envContent);
    }

    // 3. Install dependencies
    await sandbox.commands.run(installCommand, {
      cwd: '/app',
      timeoutMs: 5 * 60_000, // 5 minutes max
    });

    // 4. Start dev server in background (don't await — it runs forever)
    sandbox.commands.run(startCommand, {
      cwd: '/app',
      background: true,
    });

    // 5. Wait for server to be ready (poll port 3000 or 5173)
    const port = detectPort(startCommand); // 3000 for Next.js, 5173 for Vite
    const previewUrl = await waitForServer(sandbox, port);

    // Store for later file updates
    activeSandboxes.set(sessionId, { sandbox, previewUrl });

    return Response.json({ success: true, previewUrl, sandboxId });

  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}

function detectPort(startCommand: string): number {
  if (startCommand.includes('3000')) return 3000;
  if (startCommand.includes('4000')) return 4000;
  if (startCommand.includes('5173')) return 5173; // Vite default
  if (startCommand.includes('next')) return 3000;
  if (startCommand.includes('vite')) return 5173;
  if (startCommand.includes('react-scripts')) return 3000;
  return 3000; // fallback
}

async function waitForServer(sandbox: Sandbox, port: number, maxWaitMs = 60_000): Promise<string> {
  const host = sandbox.getHost(port);
  const url = `https://${host}`;
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    try {
      // Try to hit the server
      await sandbox.commands.run(
        `curl -sf http://localhost:${port} > /dev/null 2>&1 && echo "ready"`,
        { timeoutMs: 3_000 }
      );
      return url;
    } catch {
      await new Promise(r => setTimeout(r, 2_000));
    }
  }
  throw new Error(`Server on port ${port} did not start within ${maxWaitMs / 1000}s`);
}
```

---

### Step 3 — Streaming Logs via Server-Sent Events

The user needs to see what's happening during the 30–90 second install. SSE streams logs in real time.

#### `app/api/preview/logs/route.ts`

```typescript
import { Sandbox } from 'e2b';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId')!;
  const repoFullName = searchParams.get('repo')!;
  const branch = searchParams.get('branch')!;
  const accessToken = searchParams.get('token')!;
  const installCommand = searchParams.get('install') || 'npm install';
  const startCommand = searchParams.get('start') || 'npm run dev';
  const provider = searchParams.get('provider') || 'github';

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: object) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        send('log', { message: '🚀 Booting sandbox...' });

        const sandbox = await Sandbox.create({
          apiKey: process.env.E2B_API_KEY,
          timeoutMs: 60 * 60 * 1000,
        });

        send('log', { message: '✅ Sandbox ready' });
        send('log', { message: `📥 Cloning ${repoFullName}...` });

        const gitUrl = provider === 'github'
          ? `https://oauth2:${accessToken}@github.com/${repoFullName}.git`
          : `https://oauth2:${accessToken}@gitlab.com/${repoFullName}.git`;

        // Clone with output streaming
        const cloneProc = await sandbox.commands.run(
          `git clone --depth 1 --branch ${branch} ${gitUrl} /app 2>&1`,
          { timeoutMs: 60_000, background: true }
        );

        for await (const chunk of cloneProc.stdout) {
          send('log', { message: chunk });
        }

        send('log', { message: `⬇️  Running: ${installCommand}` });

        // Install with output streaming
        const installProc = await sandbox.commands.run(installCommand, {
          cwd: '/app',
          background: true,
          timeoutMs: 5 * 60_000,
        });

        for await (const chunk of installProc.stdout) {
          send('log', { message: chunk });
        }
        for await (const chunk of installProc.stderr) {
          send('log', { message: chunk });
        }

        await installProc.wait();

        send('log', { message: `🚀 Starting: ${startCommand}` });

        // Start dev server
        sandbox.commands.run(startCommand, {
          cwd: '/app',
          background: true,
        });

        // Wait for server ready
        const port = detectPort(startCommand);
        send('log', { message: `⏳ Waiting for server on port ${port}...` });

        const previewUrl = await waitForServer(sandbox, port);

        // Store sandbox for file updates
        // (in production use Redis or a DB)
        globalThis.__sandboxes = globalThis.__sandboxes || new Map();
        globalThis.__sandboxes.set(sessionId, sandbox);

        send('ready', { previewUrl });

      } catch (error) {
        send('error', { message: String(error) });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function detectPort(cmd: string): number {
  if (cmd.includes('vite')) return 5173;
  return 3000;
}

async function waitForServer(sandbox: Sandbox, port: number): Promise<string> {
  const host = sandbox.getHost(port);
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    try {
      const result = await sandbox.commands.run(
        `curl -sf http://localhost:${port} -o /dev/null -w "%{http_code}"`,
        { timeoutMs: 3_000 }
      );
      if (result.stdout.trim().startsWith('2') || result.stdout.trim() === '200') {
        return `https://${host}`;
      }
    } catch { /* not ready yet */ }
    await new Promise(r => setTimeout(r, 2_000));
  }
  // Return URL anyway — server might be ready but curl check failed
  return `https://${sandbox.getHost(port)}`;
}
```

---

### Step 4 — Update Files When AI Makes Changes

#### `app/api/preview/update/route.ts`

```typescript
export async function POST(request: Request) {
  const { sessionId, changes } = await request.json();
  // changes = { "src/app/page.tsx": "new content", ... }

  const sandbox = globalThis.__sandboxes?.get(sessionId);
  if (!sandbox) {
    return Response.json({ success: false, error: 'Sandbox not found or expired' });
  }

  try {
    // Write all changed files into the running sandbox
    for (const [filePath, content] of Object.entries(changes)) {
      await sandbox.files.write(`/app/${filePath}`, content as string);
    }
    // HMR (Vite/Next.js) detects file changes and hot-reloads automatically
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: String(error) });
  }
}
```

---

### Step 5 — Frontend Component: `LivePreview.tsx`

```typescript
'use client';
import { useState, useEffect, useRef } from 'react';

type PreviewStatus = 'idle' | 'booting' | 'cloning' | 'installing' | 'starting' | 'ready' | 'error';

interface LivePreviewProps {
  sessionId: string;
  repoFullName: string;
  branch: string;
  accessToken: string;
  installCommand: string;
  startCommand: string;
  provider: 'github' | 'gitlab';
  changedFiles: Record<string, string>;  // from AI — triggers hot update
  envVars?: Record<string, string>;
}

export function LivePreview({
  sessionId, repoFullName, branch, accessToken,
  installCommand, startCommand, provider,
  changedFiles, envVars = {},
}: LivePreviewProps) {
  const [status, setStatus] = useState<PreviewStatus>('idle');
  const [previewUrl, setPreviewUrl] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const [error, setError] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // When AI changes files → push to running sandbox
  useEffect(() => {
    if (status !== 'ready' || Object.keys(changedFiles).length === 0) return;

    fetch('/api/preview/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, changes: changedFiles }),
    });
    // HMR handles the reload automatically — no iframe refresh needed
  }, [changedFiles, status, sessionId]);

  function addLog(message: string) {
    setLogs(prev => [...prev.slice(-200), message]);
  }

  async function startPreview() {
    if (hasStarted.current) return;
    hasStarted.current = true;

    setStatus('booting');
    setLogs([]);
    setError('');

    const params = new URLSearchParams({
      sessionId,
      repo: repoFullName,
      branch,
      token: accessToken,
      install: installCommand,
      start: startCommand,
      provider,
    });

    // Connect to SSE stream for real-time logs
    const evtSource = new EventSource(`/api/preview/logs?${params}`);

    evtSource.addEventListener('log', (e) => {
      const { message } = JSON.parse(e.data);
      addLog(message);

      // Update status based on log content
      if (message.includes('Cloning')) setStatus('cloning');
      if (message.includes('npm install') || message.includes('Installing')) setStatus('installing');
      if (message.includes('Starting') || message.includes('dev server')) setStatus('starting');
    });

    evtSource.addEventListener('ready', (e) => {
      const { previewUrl } = JSON.parse(e.data);
      setPreviewUrl(previewUrl);
      setStatus('ready');
      setShowLogs(false);
      evtSource.close();
    });

    evtSource.addEventListener('error', (e) => {
      const { message } = JSON.parse((e as MessageEvent).data || '{"message":"Unknown error"}');
      setError(message);
      setStatus('error');
      evtSource.close();
    });

    evtSource.onerror = () => {
      if (status !== 'ready') {
        setStatus('error');
        setError('Connection to preview server lost');
      }
      evtSource.close();
    };
  }

  const statusLabel: Record<PreviewStatus, string> = {
    idle: 'Not started',
    booting: '🚀 Booting sandbox (~2s)...',
    cloning: '📥 Cloning repository...',
    installing: '⬇️ Installing dependencies...',
    starting: '🔄 Starting dev server...',
    ready: '● Live',
    error: '❌ Error',
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 rounded-xl overflow-hidden border border-gray-800">

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200">🖥️ Live Preview</span>
          {status === 'ready' && (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Live
            </span>
          )}
          {status !== 'idle' && status !== 'ready' && status !== 'error' && (
            <span className="text-xs text-yellow-400">{statusLabel[status]}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {status === 'ready' && previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded bg-gray-800">
              ↗ Open
            </a>
          )}
          <button onClick={() => setShowLogs(v => !v)}
            className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded bg-gray-800">
            {showLogs ? 'Hide Logs' : 'Logs'}
          </button>
          {status === 'idle' && (
            <button onClick={startPreview}
              className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium">
              ▶ Start Preview
            </button>
          )}
          {(status === 'ready' || status === 'error') && (
            <button onClick={() => { hasStarted.current = false; startPreview(); }}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1 rounded-lg">
              ↺ Restart
            </button>
          )}
        </div>
      </div>

      {/* Progress bar during install */}
      {['booting','cloning','installing','starting'].includes(status) && (
        <div className="h-0.5 bg-gray-800 shrink-0">
          <div className="h-full bg-blue-500 animate-pulse" style={{ width: '60%' }} />
        </div>
      )}

      {/* Terminal logs */}
      {showLogs && (
        <div className="bg-gray-950 font-mono text-xs text-green-400 p-3 h-48 overflow-y-auto shrink-0 border-b border-gray-800">
          {logs.length === 0 && status === 'idle' && (
            <p className="text-gray-600">Logs will appear here when preview starts.</p>
          )}
          {logs.map((line, i) => (
            <div key={i} className="leading-5 whitespace-pre-wrap break-all">{line}</div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )}

      {/* Preview iframe or empty state */}
      <div className="flex-1 bg-white min-h-0">
        {status === 'ready' && previewUrl ? (
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title="Live Preview"
            allow="cross-origin-isolated"
          />
        ) : status === 'error' ? (
          <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-3 p-6">
            <span className="text-4xl">❌</span>
            <p className="text-red-400 text-sm text-center">{error}</p>
            <button onClick={() => { hasStarted.current = false; startPreview(); }}
              className="text-xs bg-blue-500 text-white px-4 py-2 rounded-lg">
              Try Again
            </button>
          </div>
        ) : status === 'idle' ? (
          <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-4 text-gray-400">
            <span className="text-5xl">🖥️</span>
            <p className="text-sm font-medium">Start the live preview</p>
            <p className="text-xs text-gray-600 text-center max-w-xs">
              Runs your project in a real cloud VM.
              Install + start takes 30–90 seconds the first time.
            </p>
            <button onClick={startPreview}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-5 py-2.5 rounded-xl font-medium">
              ▶ Start Preview
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">{statusLabel[status]}</p>
            {status === 'installing' && (
              <p className="text-xs text-gray-600">This may take 30–90 seconds for large projects.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### Step 6 — Optimising Speed (Making It Faster)

The main bottleneck is `npm install`. Here's how to cut it down:

#### Strategy 1: Use pnpm instead of npm
```typescript
// pnpm install is 2-3x faster than npm install
// Set as default in RunCommandsCard:
const installCommand = 'pnpm install'; // was 'npm install'

// Make sure pnpm is available in the sandbox:
await sandbox.commands.run('npm install -g pnpm', { timeoutMs: 30_000 });
await sandbox.commands.run('pnpm install', { cwd: '/app', timeoutMs: 3 * 60_000 });
```

#### Strategy 2: Show Diff First, Preview Second
```
User sends prompt
      ↓
AI changes files → show diff immediately (< 5 seconds) ← User sees this instantly
      ↓
In PARALLEL: start sandbox boot + clone + install (background)
      ↓
When sandbox ready → switch right panel to live preview
```
The user is reading the diff while the sandbox installs. By the time they finish reviewing, the preview is often ready.

#### Strategy 3: Cache node_modules Across Restarts
```typescript
// When restarting for same repo+branch:
// Don't re-clone, don't re-install — just write changed files and restart the dev server

async function restartWithChanges(sandbox: Sandbox, changes: Record<string, string>, startCommand: string) {
  // Kill existing dev server
  await sandbox.commands.run('pkill -f "node"', { timeoutMs: 5_000 });

  // Write new files
  for (const [path, content] of Object.entries(changes)) {
    await sandbox.files.write(`/app/${path}`, content);
  }

  // Restart dev server (no reinstall needed)
  sandbox.commands.run(startCommand, { cwd: '/app', background: true });
}
// Result: subsequent previews after first = ~5-10 seconds instead of 60-90s
```

#### Strategy 4: Skeleton/Placeholder While Loading
```typescript
// Show an animated "building" placeholder in the iframe
// while install is running, so the user sees activity not a blank white box:

{status === 'installing' && (
  <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
    <div className="text-center text-gray-400">
      <div className="text-4xl mb-2">⚙️</div>
      <p className="text-sm">Installing {installCommand}...</p>
      <p className="text-xs mt-1">
        {Math.round(installProgress)}% complete
      </p>
    </div>
  </div>
)}
```

---

### Step 7 — Fallback: WebContainers for Simple Projects

For very simple projects (plain HTML, basic Vite with few deps), offer WebContainers as a faster alternative that works purely in-browser:

```typescript
// Detect if project is "simple" based on package.json
function isSimpleProject(packageJson: string): boolean {
  try {
    const pkg = JSON.parse(packageJson);
    const deps = Object.keys({
      ...pkg.dependencies,
      ...pkg.devDependencies,
    });
    // Simple = fewer than 15 direct dependencies
    return deps.length < 15;
  } catch {
    return false;
  }
}

// In the preview component:
async function startPreview() {
  const isSimple = isSimpleProject(projectPackageJson);

  if (isSimple) {
    // Use WebContainers (fast, no server cost)
    startWebContainerPreview();
  } else {
    // Use E2B (reliable, works for any project)
    startE2BPreview();
  }
}
```

---

## Summary: What to Build

```
Priority 1 — E2B Integration (main path)
  ✅ Install e2b package
  ✅ Add E2B_API_KEY to .env.sample and .env.local
  ✅ Create /api/preview/start route
  ✅ Create /api/preview/logs SSE route
  ✅ Create /api/preview/update route (for AI file changes)
  ✅ Build LivePreview component with log terminal + iframe

Priority 2 — Speed Optimisations
  ✅ Use pnpm by default
  ✅ Start preview in parallel while user reads the diff
  ✅ Cache sandbox per session (don't re-clone on every AI prompt)
  ✅ Hot-write files to running sandbox instead of restarting

Priority 3 — WebContainer Fallback
  ✅ Detect simple projects (<15 deps)
  ✅ Use WebContainers for those (no server cost, instant-ish)
  ✅ Fall back to E2B for everything else
```

---

## Expected Timeline After Build

| Action | Time |
|---|---|
| Sandbox boot | ~150ms |
| Git clone (shallow) | ~5-10s |
| npm install (typical React app) | ~30-60s |
| pnpm install (same app) | ~15-30s |
| Dev server start | ~5-10s |
| **Total first preview** | **~45-90 seconds** |
| AI change → HMR reload | **~1-3 seconds** |
| Restart with cached deps | **~10-15 seconds** |

---

## Cursor Prompt to Implement This

```
I am building a Next.js 14 app called VibeCode — an AI code editor.
I need to implement a live preview feature where the user's project
runs in a real cloud sandbox.

Please implement the following using E2B SDK:

1. Install: npm install e2b

2. Create file: app/api/preview/logs/route.ts
   - This is a Server-Sent Events (SSE) GET route
   - It reads query params: sessionId, repo, branch, token, install, start, provider
   - It boots an E2B sandbox using process.env.E2B_API_KEY
   - It clones the repo using git clone --depth 1 with the access token
   - It runs the install command and streams stdout/stderr as SSE events
   - It runs the start command in the background
   - It polls localhost on the correct port until the server responds
   - When ready it sends a "ready" SSE event with { previewUrl }
   - It stores the sandbox instance in globalThis.__sandboxes with sessionId as key

3. Create file: app/api/preview/update/route.ts
   - POST route that accepts { sessionId, changes: Record<string, string> }
   - Looks up sandbox from globalThis.__sandboxes
   - Writes each changed file into the sandbox at /app/{filePath}
   - Returns { success: true }

4. Create file: components/LivePreview.tsx
   - Client component with props: sessionId, repoFullName, branch, accessToken,
     installCommand, startCommand, provider, changedFiles, envVars
   - Has a terminal log panel that shows SSE log events in real time (auto-scrolls)
   - Has a status: idle | booting | cloning | installing | starting | ready | error
   - When status is ready, shows the previewUrl in an iframe
   - When changedFiles prop changes (after AI edit), calls /api/preview/update
   - Has a "Start Preview" button, a "Restart" button, and a "Show/Hide Logs" toggle
   - Has a "Open in new tab" link when ready

5. Add E2B_API_KEY to the .env.local template

Use TypeScript throughout. Handle errors gracefully.
The SSE stream should use ReadableStream with a TextEncoder.
Use pnpm install as the default install command for speed.
```

---

## Cost Estimate

| Usage | Cost |
|---|---|
| Free tier | $100 credit (no credit card) |
| 1 sandbox hour | ~$0.05 |
| 100 preview sessions @ 30 min each | ~$2.50 |
| Heavy demo day (500 sessions) | ~$12.50 |

E2B is effectively free for hackathon/prototype scale. Switch to Pro ($150/month) for longer sessions when you have real users.

---

*Research complete. Recommendation: E2B for main preview path, WebContainers as fallback for simple projects.*
*Add `E2B_API_KEY` to `.env.sample` and `.env.local` immediately.*