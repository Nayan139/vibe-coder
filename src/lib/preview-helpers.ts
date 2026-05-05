export function detectPreviewPort(startCommand: string): number {
  const cmd = startCommand.toLowerCase();
  const portFlag = /--port[=\s]+(\d+)/i.exec(startCommand);
  if (portFlag) return Number(portFlag[1]);
  const pFlag = /-p\s+(\d+)/i.exec(startCommand);
  if (pFlag) return Number(pFlag[1]);
  if (cmd.includes("5173")) return 5173;
  if (cmd.includes("4173")) return 4173;
  if (cmd.includes("4000")) return 4000;
  if (cmd.includes("vite")) return 5173;
  if (cmd.includes("react-scripts")) return 3000;
  if (cmd.includes("next")) return 3000;
  return 3000;
}

export function buildGitCloneUrl(
  provider: string,
  repoFullName: string,
  accessToken: string
): string {
  const enc = encodeURIComponent(accessToken);
  if (provider === "gitlab") {
    return `https://oauth2:${enc}@gitlab.com/${repoFullName}.git`;
  }
  return `https://x-access-token:${enc}@github.com/${repoFullName}.git`;
}

export async function waitForHttpOk(
  previewUrl: string,
  maxWaitMs: number,
  onLog?: (line: string) => void
): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt += 1;
    try {
      const res = await fetch(previewUrl, {
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "text/html,*/*" },
      });
      if (res.ok || res.status === 304 || res.status === 404 || res.status === 500) {
        onLog?.(`Preview server responded (HTTP ${res.status}).`);
        return;
      }
    } catch {
      /* not ready */
    }
    if (attempt === 1) onLog?.("Waiting for dev server to accept traffic…");
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Dev server did not become reachable within ${Math.round(maxWaitMs / 1000)}s.`);
}
