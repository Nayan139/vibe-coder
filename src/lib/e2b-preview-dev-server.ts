import type { Sandbox } from "e2b";

/** Log file where the nohup-launched dev server writes all stdout/stderr. */
export const DEV_SERVER_LOG = "/tmp/vibe-dev-server.log";

/**
 * Run a long-lived shell command detached from the E2B SDK WebSocket.
 *
 * Why this exists: `sandbox.commands.run(...)` keeps a WebSocket open for the
 * full duration of the command and reports `signal: killed` when that connection
 * blips — easy to trigger on multi-minute `npm install` runs from a Next.js
 * server on an unstable network. A detached nohup process keeps running even if
 * the SDK loses sight of it; we poll a sentinel file for the exit code.
 *
 * Streams new log content to `onLog` every ~3 s. Throws on non-zero exit code.
 */
export async function runDetachedWithLogs(
  sandbox: Sandbox,
  opts: {
    cwd: string;
    label: string;
    command: string;
    /** Extra env vars exported before running the command (e.g. NODE_OPTIONS). */
    env?: Record<string, string>;
    /** Hard timeout in ms after which we abandon polling and throw. */
    timeoutMs: number;
    onLog?: (line: string) => void;
  }
): Promise<void> {
  const { cwd, label, command, env = {}, timeoutMs, onLog } = opts;
  const safeLabel = label.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 48) || "task";
  const logFile = `/tmp/vibe-${safeLabel}.log`;
  const doneFile = `/tmp/vibe-${safeLabel}.done`;
  const scriptFile = `/tmp/vibe-${safeLabel}.sh`;

  const exports = Object.entries(env)
    .map(([k, v]) => `export ${k}=${JSON.stringify(v)}`)
    .join("\n");

  const script = [
    "#!/bin/sh",
    `cd ${JSON.stringify(cwd)}`,
    exports,
    command,
    `echo $? > ${doneFile}`,
  ]
    .filter(Boolean)
    .join("\n");

  await sandbox.files.write(scriptFile, script);

  // Fully detach the launcher: redirect stdin from /dev/null, run inside a
  // subshell with `&`, then explicitly exit. This guarantees the parent shell
  // returns immediately and `commands.run` cannot wait on a backgrounded child.
  const launchCmd = [
    `chmod +x ${scriptFile}`,
    `rm -f ${logFile} ${doneFile}`,
    `(nohup ${scriptFile} > ${logFile} 2>&1 < /dev/null &)`,
    `exit 0`,
  ].join(" && ");

  try {
    await sandbox.commands.run(launchCmd, { timeoutMs: 45_000 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to launch ${label}: ${message}`);
  }

  onLog?.(`Started ${label} (detached, log=${logFile})…`);

  // Helper: wrap every poll in try/catch so a single transient
  // `deadline_exceeded` never aborts the whole task.
  const safeRun = async (cmd: string, timeoutMs: number): Promise<string | null> => {
    try {
      const res = await sandbox.commands.run(cmd, { timeoutMs });
      return res.stdout;
    } catch {
      return null;
    }
  };

  const deadline = Date.now() + timeoutMs;
  let bytesShown = 0;
  let consecutiveSdkFailures = 0;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3_000));

    // Stream new log content
    const wcOut = await safeRun(`wc -c < ${logFile} 2>/dev/null || echo 0`, 12_000);
    if (wcOut !== null) {
      consecutiveSdkFailures = 0;
      const total = parseInt(wcOut.trim() || "0", 10);
      if (total > bytesShown) {
        const tail = await safeRun(
          `tail -c +${bytesShown + 1} ${logFile} 2>/dev/null | head -c 8192 || true`,
          15_000
        );
        if (tail) {
          const text = tail.trimEnd();
          if (text) onLog?.(text);
        }
        bytesShown = total;
      }
    } else {
      consecutiveSdkFailures += 1;
      // After many failed SDK round-trips, surface the situation but keep trying.
      if (consecutiveSdkFailures === 5) {
        onLog?.(`(sandbox slow to respond — still waiting for ${label})`);
      }
    }

    // Check sentinel
    const doneOut = await safeRun(`cat ${doneFile} 2>/dev/null || true`, 10_000);
    if (doneOut === null) continue;

    const exitText = doneOut.trim();
    if (!exitText) continue;

    const exitCode = parseInt(exitText, 10);

    // Surface any remaining log output before resolving / throwing.
    const wcFinal = await safeRun(`wc -c < ${logFile} 2>/dev/null || echo 0`, 12_000);
    const totalFinal = wcFinal !== null ? parseInt(wcFinal.trim() || "0", 10) : 0;
    if (totalFinal > bytesShown) {
      const tailFinal = await safeRun(
        `tail -c +${bytesShown + 1} ${logFile} 2>/dev/null | head -c 8192 || true`,
        15_000
      );
      if (tailFinal) {
        const text = tailFinal.trimEnd();
        if (text) onLog?.(text);
      }
    }

    if (exitCode === 0) {
      onLog?.(`${label} completed.`);
      return;
    }

    const finalTail = await safeRun(`tail -n 30 ${logFile} 2>/dev/null || true`, 15_000);
    throw new Error(
      `${label} failed (exit ${exitCode}). Last output:\n${(finalTail ?? "").trim() || "(no output)"}`
    );
  }

  // Timed out — show last log lines.
  const finalTail = await safeRun(`tail -n 60 ${logFile} 2>/dev/null || true`, 15_000);
  if (finalTail && finalTail.trim()) onLog?.(finalTail.trim());
  throw new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s.`);
}

function parseSsListeners(ssStdout: string): { host: string; port: number }[] {
  const out: { host: string; port: number }[] = [];
  for (const line of ssStdout.split("\n")) {
    const trimmed = line.trim();
    // Handle both old format ("LISTEN  0  128  ...") and new format ("tcp  LISTEN  0  128  ...")
    if (!trimmed.includes("LISTEN")) continue;
    let local = "";
    const loose = trimmed.match(/LISTEN\s+\d+\s+\d+\s+(.+?)\s+(\S+)\s*$/);
    if (loose) {
      local = loose[1].trim();
    } else {
      const parts = trimmed.split(/\s+/);
      // Old format: LISTEN recv send local peer  => local at index 3
      // New format: tcp LISTEN recv send local peer => local at index 4
      const listenIdx = parts.indexOf("LISTEN");
      if (listenIdx >= 0 && parts.length > listenIdx + 3) {
        local = parts[listenIdx + 3];
      } else if (parts.length >= 4) {
        local = parts[3];
      }
    }
    if (!local) continue;
    const colon = local.lastIndexOf(":");
    if (colon <= 0) continue;
    const host = local.slice(0, colon);
    const port = Number(local.slice(colon + 1));
    if (!Number.isFinite(port) || port <= 0) continue;
    out.push({ host, port });
  }
  return out;
}

/**
 * E2B internal ports that must never be treated as dev-server ports.
 * - 49983: envd (sandbox management daemon) — returns HTTP 401 on all requests
 * - 50005: MCP gateway
 */
const E2B_INTERNAL_PORTS = new Set([49983, 50005]);

/** E2B port URLs require a listener that is not loopback-only. */
export function isRoutableForE2bTunnel(host: string): boolean {
  if (host === "127.0.0.1") return false;
  const h = host.toLowerCase();
  if (h === "[::1]" || h === "::1") return false;
  return true;
}

function pickRoutablePort(rows: { host: string; port: number }[], preferred: number): number | null {
  // Exclude loopback-only, system ports (< 1024), and known E2B internal ports
  const ok = rows.filter(
    (r) => isRoutableForE2bTunnel(r.host) && r.port >= 1024 && !E2B_INTERNAL_PORTS.has(r.port)
  );
  if (ok.length === 0) return null;
  if (ok.some((r) => r.port === preferred)) return preferred;
  for (const p of [3000, 3001, 4173, 5173, 8080, 4000, ...new Set(ok.map((r) => r.port))]) {
    if (ok.some((r) => r.port === p)) return p;
  }
  return ok[0].port;
}

async function readPackageMetadata(
  sandbox: Sandbox,
  projectRoot: string
): Promise<{
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  hasPnpmLock: boolean;
} | null> {
  try {
    const pkgText = await sandbox.files.read(`${projectRoot}/package.json`);
    const pkg = JSON.parse(pkgText) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    let hasPnpmLock = false;
    try {
      await sandbox.files.read(`${projectRoot}/pnpm-lock.yaml`);
      hasPnpmLock = true;
    } catch {
      /* no pnpm lock */
    }
    return { ...pkg, hasPnpmLock };
  } catch {
    return null;
  }
}

/**
 * Build the dev-server command that binds on 0.0.0.0 so E2B's tunnel can reach it.
 * Uses -H / --hostname for Next.js; --host for Vite; HOST env var for react-scripts.
 */
export async function buildManagedDevCommand(
  sandbox: Sandbox,
  projectRoot: string,
  userStartCommand: string,
  port: number
): Promise<string> {
  const meta = await readPackageMetadata(sandbox, projectRoot);
  if (!meta) {
    return `sh -c ${JSON.stringify(`export PORT=${port} HOST=0.0.0.0 HOSTNAME=0.0.0.0; ${userStartCommand}`)}`;
  }

  const deps = { ...meta.dependencies, ...meta.devDependencies };
  const devScript = meta.scripts?.dev ?? "";
  const turbo = /--turbo|--turbopack/i.test(devScript) ? " --turbopack" : "";

  if (deps.next || /\bnext\s+dev\b/i.test(devScript)) {
    const args = `dev -H 0.0.0.0 --hostname 0.0.0.0 --port ${port}${turbo}`;
    if (meta.hasPnpmLock) return `pnpm exec next ${args}`;
    return `npx --yes next ${args}`;
  }

  if (deps.vite) {
    return `npx --yes vite --host 0.0.0.0 --port ${port}`;
  }

  if (devScript.includes("react-scripts")) {
    return `sh -c ${JSON.stringify(`export HOST=0.0.0.0 PORT=${port}; ${devScript}`)}`;
  }

  const trimmed = userStartCommand.trim();
  if (/^(npm|pnpm|yarn)\s+run\s+dev\b/i.test(trimmed)) {
    return `sh -c ${JSON.stringify(`export PORT=${port} HOST=0.0.0.0 HOSTNAME=0.0.0.0; ${trimmed} -- --hostname 0.0.0.0 --host 0.0.0.0 -H 0.0.0.0 -p ${port}`)}`;
  }

  return `sh -c ${JSON.stringify(`export PORT=${port} HOST=0.0.0.0 HOSTNAME=0.0.0.0; ${userStartCommand}`)}`;
}

/**
 * Launch the dev server via nohup so it keeps running independently of the SDK connection.
 * All output is written to DEV_SERVER_LOG for visibility during the wait phase.
 */
export async function launchPreviewDevServerManaged(
  sandbox: Sandbox,
  projectRoot: string,
  port: number,
  userStartCommand: string,
  onLog?: (line: string) => void
): Promise<void> {
  const cmd = await buildManagedDevCommand(sandbox, projectRoot, userStartCommand, port);
  onLog?.(`Building dev server launcher (cwd=${projectRoot}): ${cmd}`);

  // Write a small shell script so the complex `cmd` string is preserved verbatim
  // without any extra quoting layers that inline execution would introduce.
  const launcherScript = [
    "#!/bin/sh",
    `cd ${JSON.stringify(projectRoot)}`,
    `export PORT=${port} HOST=0.0.0.0 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1`,
    cmd,
  ].join("\n");

  await sandbox.files.write("/tmp/vibe-launch.sh", launcherScript);

  // Fully detached launch: subshell + redirected stdin + explicit exit.
  // Without `</dev/null` and the subshell, the wrapper shell can stay alive
  // waiting for the backgrounded child, which the SDK reports as
  // `deadline_exceeded` once `commands.run`'s timeout fires.
  const launchCmd = [
    `chmod +x /tmp/vibe-launch.sh`,
    `rm -f ${DEV_SERVER_LOG}`,
    `(nohup /tmp/vibe-launch.sh > ${DEV_SERVER_LOG} 2>&1 < /dev/null &)`,
    `exit 0`,
  ].join(" && ");

  try {
    await sandbox.commands.run(launchCmd, { timeoutMs: 45_000 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to launch dev server: ${message}`);
  }

  onLog?.(`Dev server process launched. Streaming output from ${DEV_SERVER_LOG}…`);

  // Give the process a moment to write its first lines, then surface them.
  // Wrapped in try/catch so a transient SDK timeout here doesn't abort the run.
  await new Promise((r) => setTimeout(r, 3_000));
  try {
    const earlyOut = await sandbox.commands.run(
      `cat ${DEV_SERVER_LOG} 2>/dev/null | head -40 || true`,
      { timeoutMs: 15_000 }
    );
    if (earlyOut.stdout.trim()) onLog?.(earlyOut.stdout.trim());
  } catch {
    /* sandbox slow to respond — wait loop will pick up the log shortly */
  }
}

/**
 * Poll until the dev server is reachable on a non-loopback port.
 * Streams the dev-server log file during the wait so startup errors are visible.
 * Returns the port to pass to sandbox.getHost().
 */
export async function waitForPreviewDevServer(
  sandbox: Sandbox,
  preferredPort: number,
  trafficAccessToken: string | undefined,
  maxWaitMs: number,
  onLog?: (line: string) => void
): Promise<number> {
  const deadline = Date.now() + maxWaitMs;
  let attempt = 0;
  let logBytesShown = 0;

  // Helper: wrap each SDK call so a single transient `deadline_exceeded`
  // never aborts the whole wait loop.
  const safeRun = async (cmd: string, timeoutMs: number): Promise<string | null> => {
    try {
      const res = await sandbox.commands.run(cmd, { timeoutMs });
      return res.stdout;
    } catch {
      return null;
    }
  };

  // Initial pause — nohup process needs a moment to start.
  await new Promise((r) => setTimeout(r, 2_000));

  while (Date.now() < deadline) {
    attempt += 1;

    // ── Stream any new dev-server log output every 4 attempts (~10 s) ──────────
    if (attempt % 4 === 0) {
      const wcOut = await safeRun(`wc -c < ${DEV_SERVER_LOG} 2>/dev/null || echo 0`, 12_000);
      if (wcOut !== null) {
        const totalBytes = parseInt(wcOut.trim() || "0", 10);
        if (totalBytes > logBytesShown) {
          const newContent = await safeRun(
            `tail -c +${logBytesShown + 1} ${DEV_SERVER_LOG} 2>/dev/null | head -c 4096 || true`,
            15_000
          );
          if (newContent) {
            const text = newContent.trim();
            if (text) onLog?.(text);
          }
          logBytesShown = totalBytes;
        }
      }
    }

    // ── Check socket listeners ───────────────────────────────────────────────
    const ssOut = await safeRun(`ss -tln 2>/dev/null || true`, 20_000);
    if (ssOut === null) {
      await new Promise((r) => setTimeout(r, 2500));
      continue;
    }
    const listeners = parseSsListeners(ssOut);
    const routablePort = pickRoutablePort(listeners, preferredPort);

    if (routablePort != null) {
      const probeOut = await safeRun(
        `curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 2 --max-time 12 http://127.0.0.1:${routablePort}/ 2>/dev/null || printf '000'`,
        25_000
      );
      const code = (probeOut ?? "").trim();
      // Accept valid 3-digit HTTP codes but reject 401/403 — those indicate auth-gated system
      // services (e.g. E2B envd on port 49983), not a real dev web server.
      if (code && /^[1-5]\d{2}$/.test(code) && code !== "401" && code !== "403") {
        const rows = listeners.filter((l) => l.port === routablePort && isRoutableForE2bTunnel(l.host));
        onLog?.(
          `Dev server reachable on port ${routablePort} (HTTP ${code}); listeners: ${rows.map((r) => `${r.host}:${r.port}`).join(", ") || "—"}`
        );

        const previewUrl = `https://${sandbox.getHost(routablePort)}`;
        // Wait up to 90 s for the app to return a good response.
        // We do NOT accept HTTP 5xx here — that means the app is still compiling or
        // has an error. We keep polling so the frontend only gets "ready" when the
        // iframe will actually show content, not a blank Turbopack compilation page.
        const publicDeadline = Date.now() + 90_000;
        let pubAttempt = 0;
        let lastHttpStatus = 0;
        onLog?.(`Checking public URL: ${previewUrl} …`);
        while (Date.now() < publicDeadline) {
          pubAttempt += 1;
          try {
            const headers: Record<string, string> = { Accept: "text/html,*/*" };
            if (trafficAccessToken) headers["e2b-traffic-access-token"] = trafficAccessToken;
            const res = await fetch(previewUrl, {
              redirect: "follow",
              signal: AbortSignal.timeout(12_000),
              headers,
            });
            lastHttpStatus = res.status;
            if (res.ok || res.status === 304 || res.status === 404) {
              onLog?.(`Public preview URL ready (HTTP ${res.status}).`);
              return routablePort;
            }
            if (res.status >= 500) {
              if (pubAttempt === 1) {
                onLog?.(`HTTP ${res.status} — Next.js is still compiling, waiting…`);
              }
              // keep polling
            }
          } catch {
            /* tunnel still warming up */
          }
          await new Promise((r) => setTimeout(r, 3_000));
        }
        // 90 s elapsed — the app may have a genuine error; show it anyway so the
        // user can see the Next.js error overlay and debug.
        onLog?.(
          `App returned HTTP ${lastHttpStatus || "?"} after 90 s — opening preview (check for app errors).`
        );
        return routablePort;
      }
    } else if (attempt % 8 === 0) {
      const localOnly = listeners.filter((l) => l.port === preferredPort);
      if (localOnly.length > 0) {
        onLog?.(
          `Port ${preferredPort} still loopback-only (${localOnly.map((l) => l.host).join(", ")}). Waiting for 0.0.0.0 / * bind…`
        );
      }
    }

    if (attempt === 1) {
      onLog?.(
        `Waiting for dev server on port ${preferredPort} (or another routable port)…`
      );
    }

    // ── Full diagnostic dump every 12 attempts (~30 s), includes dev-server log ─
    if (attempt % 12 === 0) {
      const diagOut = await safeRun(
        [
          `echo "=== ss ==="`,
          `ss -tln 2>/dev/null | head -20`,
          `echo "=== processes ==="`,
          `pgrep -a node 2>/dev/null | head -10 || true`,
          `echo "=== dev-server log (last 40 lines) ==="`,
          `tail -n 40 ${DEV_SERVER_LOG} 2>/dev/null || echo "(no log yet)"`,
        ].join("; "),
        25_000
      );
      if (diagOut && diagOut.trim()) onLog?.(diagOut.trim());
      // Reset byte tracker to full file so incremental reader stays in sync.
      const wcOut2 = await safeRun(`wc -c < ${DEV_SERVER_LOG} 2>/dev/null || echo 0`, 12_000);
      if (wcOut2 !== null) {
        logBytesShown = parseInt(wcOut2.trim() || "0", 10);
      }
    }

    await new Promise((r) => setTimeout(r, 2500));
  }

  // Final dump before throwing.
  const dumpOut = await safeRun(
    [
      `echo "=== ss ==="`,
      `ss -tln 2>/dev/null | head -40 || true`,
      `echo "=== processes ==="`,
      `pgrep -a node 2>/dev/null | head -15 || true`,
      `echo "=== dev-server log (last 60 lines) ==="`,
      `tail -n 60 ${DEV_SERVER_LOG} 2>/dev/null || echo "(no log)"`,
    ].join("; "),
    25_000
  );
  if (dumpOut && dumpOut.trim()) onLog?.(dumpOut.trim());

  throw new Error(
    `No E2B-routable HTTP listener within ${Math.round(maxWaitMs / 1000)}s. ` +
      "Check the dev-server log above for startup errors."
  );
}
