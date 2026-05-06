import { Sandbox } from "e2b";
import { createClient } from "@/lib/supabase/server";
import { previewSandboxes } from "@/lib/e2b-preview-store";
import { E2B_PREVIEW_PROJECT_ROOT } from "@/lib/e2b-preview-paths";
import {
  launchPreviewDevServerManaged,
  runDetachedWithLogs,
  waitForPreviewDevServer,
} from "@/lib/e2b-preview-dev-server";
import { buildGitCloneUrl, detectPreviewPort } from "@/lib/preview-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel Hobby enforces max 300s for Serverless Functions.
export const maxDuration = 300;

type StreamBody = {
  previewKey?: string;
  connectionId?: string;
  repoFullName?: string;
  branch?: string;
  provider?: string;
  installCommand?: string;
  startCommand?: string;
  overlayFiles?: Record<string, string>;
  envVars?: Record<string, string>;
};

function shellSingleQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function normalizeRelativePath(path: string): string {
  return path.replace(/^\//, "").replace(/\.\./g, "");
}

function sse(controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder, event: string, data: unknown) {
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

export async function POST(request: Request) {
  const apiKey = process.env.E2B_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { success: false, error: "Live preview is not configured (missing E2B_API_KEY)." },
      { status: 503 }
    );
  }

  const body = (await request.json()) as StreamBody;
  const {
    previewKey,
    connectionId,
    repoFullName,
    branch = "main",
    provider = "github",
    installCommand = "pnpm install",
    startCommand = "npm run dev",
    overlayFiles = {},
    envVars = {},
  } = body;

  if (!previewKey || !connectionId || !repoFullName) {
    return Response.json(
      { success: false, error: "previewKey, connectionId, and repoFullName are required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: connection } = await supabase
    .from("git_connections")
    .select("provider, access_token")
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .single();

  if (!connection?.access_token) {
    return Response.json({ success: false, error: "Connection not found" }, { status: 404 });
  }

  const gitProvider = ((provider ?? "github").toLowerCase() === "gitlab" ? "gitlab" : "github") as
    | "github"
    | "gitlab";
  if (connection.provider !== gitProvider) {
    return Response.json(
      { success: false, error: "Connection provider does not match the requested preview provider." },
      { status: 400 }
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const log = (message: string) => sse(controller, encoder, "log", { message });
      const closeWithReady = (previewUrl: string, sandboxId: string) => {
        sse(controller, encoder, "ready", { previewUrl, sandboxId });
      };

      const isPreviewHealthy = async (
        previewUrl: string,
        trafficAccessToken: string | undefined
      ): Promise<boolean> => {
        try {
          const headers: Record<string, string> = { Accept: "text/html,*/*" };
          if (trafficAccessToken) headers["e2b-traffic-access-token"] = trafficAccessToken;
          const res = await fetch(previewUrl, {
            headers,
            redirect: "follow",
            signal: AbortSignal.timeout(12_000),
          });
          return res.ok || res.status === 304 || res.status === 404;
        } catch {
          return false;
        }
      };

      try {
        const prev = previewSandboxes.get(previewKey);
        if (prev && prev.userId !== user.id) {
          sse(controller, encoder, "error", { message: "Preview session key is not available." });
          return;
        }
        if (prev && prev.userId === user.id) {
          log("Checking existing preview sandbox…");
          const healthy = await isPreviewHealthy(prev.previewUrl, prev.sandbox.trafficAccessToken);
          if (healthy) {
            log("Reusing warm sandbox — preview is already ready.");
            closeWithReady(prev.previewUrl, prev.sandbox.sandboxId);
            return;
          }
          log("Previous sandbox is unhealthy; recreating preview…");
          await Sandbox.kill(prev.sandbox.sandboxId, { apiKey }).catch(() => {});
          previewSandboxes.delete(previewKey);
        }

        log("Booting cloud sandbox…");
        const sandbox = await Sandbox.create({
          apiKey,
          timeoutMs: 3_600_000,
          network: { allowPublicTraffic: true },
        });

        log(`Sandbox ${sandbox.sandboxId} ready.`);

        const gitUrl = buildGitCloneUrl(gitProvider, repoFullName, connection.access_token);
        const root = E2B_PREVIEW_PROJECT_ROOT;
        const cloneCmd = `rm -rf ${root} && git clone --depth 1 --branch ${shellSingleQuote(branch)} ${shellSingleQuote(gitUrl)} ${root}`;

        log(`Cloning ${repoFullName} (${branch}) into ${root}…`);
        // Run clone detached so a transient SDK websocket blip cannot kill it
        // mid-clone with `signal: killed` / `deadline_exceeded`.
        await runDetachedWithLogs(sandbox, {
          cwd: "/tmp",
          label: "clone",
          command: cloneCmd,
          timeoutMs: 180_000,
          onLog: log,
        });

        const entries = Object.entries(overlayFiles ?? {}).filter(
          ([p]) => normalizeRelativePath(p).length > 0
        );
        if (entries.length > 0) {
          log(`Applying ${entries.length} local file overlay(s) from your session…`);
          for (const [raw, content] of entries) {
            const rel = normalizeRelativePath(raw);
            await sandbox.files.write(`${root}/${rel}`, content);
          }
        }

        const envKeys = Object.keys(envVars ?? {}).filter((k) => k.length > 0);
        if (envKeys.length > 0) {
          log("Writing .env.local for preview…");
          const text = envKeys.map((k) => `${k}=${envVars[k]}`).join("\n");
          await sandbox.files.write(`${root}/.env.local`, text);
        }

        if (/\bpnpm\b/.test(installCommand)) {
          log("Enabling Corepack for pnpm…");
          await sandbox.commands
            .run("corepack enable && corepack prepare pnpm@latest --activate", {
              timeoutMs: 120_000,
              onStdout: (d) => log(String(d).trimEnd()),
              onStderr: (d) => log(String(d).trimEnd()),
            })
            .catch(() => {
              log("(corepack unavailable — continuing with install command as-is)");
            });
        }

        // Add a 1 GB swap file so npm install on small E2B sandboxes is less likely
        // to be OOM-killed. Best-effort; ignore failures (no root, no disk, etc.).
        log("Configuring swap to reduce OOM risk during install…");
        await sandbox.commands
          .run(
            "(sudo -n true 2>/dev/null && (sudo fallocate -l 1G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=1024 2>/dev/null) && sudo chmod 600 /swapfile && sudo mkswap /swapfile >/dev/null 2>&1 && sudo swapon /swapfile 2>/dev/null && echo 'swap on') || echo 'swap unavailable'",
            { timeoutMs: 60_000 }
          )
          .then((r) => log(r.stdout.trim() || "(no swap output)"))
          .catch(() => log("(swap setup skipped)"));

        // Build a more resilient install command:
        // - --no-audit / --no-fund / --no-progress: less network + memory + noise
        // - --legacy-peer-deps: avoids npm 7+ peer-dep failures on real-world repos
        const isNpmInstall = /^\s*npm\s+(install|i|ci)\b/i.test(installCommand);
        const enhancedInstall = isNpmInstall
          ? `${installCommand} --no-audit --no-fund --no-progress --legacy-peer-deps`
          : installCommand;

        log(`Installing dependencies: ${enhancedInstall}`);
        // Run install detached from the SDK WebSocket — keeps `signal: killed`
        // (caused by transient connection drops or OOM) from aborting a long install.
        // Cap node memory so the OOM-killer is less likely to fire on small sandboxes.
        await runDetachedWithLogs(sandbox, {
          cwd: root,
          label: "install",
          command: enhancedInstall,
          env: {
            NODE_OPTIONS: "--max-old-space-size=1536",
            NEXT_TELEMETRY_DISABLED: "1",
            CI: "1",
          },
          timeoutMs: 900_000,
          onLog: log,
        });

        // Ensure no stale dev/build artifacts survive between restarts.
        // Some repos/scripts create `.next` during install or prestart steps.
        log("Clearing Next.js build cache (.next)…");
        await sandbox.commands.run(`rm -rf ${root}/.next`, { timeoutMs: 60_000 }).catch(() => {});

        const preferredPort = detectPreviewPort(startCommand);
        log(`Launching dev server (E2B managed background, preferred port ${preferredPort})…`);
        await launchPreviewDevServerManaged(sandbox, root, preferredPort, startCommand, log);

        const actualPort = await waitForPreviewDevServer(
          sandbox,
          preferredPort,
          sandbox.trafficAccessToken,
          240_000,
          log
        );

        const host = sandbox.getHost(actualPort);
        const previewUrl = `https://${host}`;
        log(`Preview URL (port ${actualPort}): ${previewUrl}`);

        previewSandboxes.set(previewKey, { sandbox, previewUrl, userId: user.id });
        closeWithReady(previewUrl, sandbox.sandboxId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sse(controller, encoder, "error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
