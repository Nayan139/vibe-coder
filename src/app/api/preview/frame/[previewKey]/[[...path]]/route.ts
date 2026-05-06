import type { NextRequest } from "next/server";
import { Sandbox } from "e2b";
import { previewSandboxes } from "@/lib/e2b-preview-store";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { previewKey: string; path?: string[] };
type PersistedPreviewRef = { sandboxId: string; previewUrl: string };

// Headers that would block the iframe from embedding the proxied content.
const STRIP_RESPONSE_HEADERS = new Set([
  "x-frame-options",
  "content-security-policy",
  "cross-origin-opener-policy",
  "cross-origin-embedder-policy",
  "cross-origin-resource-policy",
  "connection",
  "transfer-encoding",
  "content-encoding",
]);

function cookieNameForPreview(previewKey: string): string {
  return `vibe_preview_ref_${previewKey}`;
}

function parsePersistedRef(raw: string | undefined): PersistedPreviewRef | null {
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as Partial<PersistedPreviewRef>;
    if (!parsed.sandboxId || !parsed.previewUrl) return null;
    return { sandboxId: parsed.sandboxId, previewUrl: parsed.previewUrl };
  } catch {
    return null;
  }
}

function encodePersistedRef(value: PersistedPreviewRef): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function extractRefFromReferer(referer: string | null): PersistedPreviewRef | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    const sandboxId = url.searchParams.get("sandboxId")?.trim();
    const previewUrl = url.searchParams.get("previewUrl")?.trim();
    if (!sandboxId || !previewUrl) return null;
    return { sandboxId, previewUrl };
  } catch {
    return null;
  }
}

function rewriteRootRelativeAssetUrls(html: string, proxyBase: string): string {
  // Root-relative URLs like "/_next/..." bypass <base> and hit this app instead
  // of the sandbox. Rewrite them to go through the preview proxy.
  const attrPattern = /(\s(?:src|href|action)=["'])\/(?!\/)([^"']*)(["'])/gi;
  return html.replace(attrPattern, (_m, prefix: string, rest: string, suffix: string) => {
    return `${prefix}${proxyBase}${rest}${suffix}`;
  });
}

async function proxyHandler(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  const { previewKey, path = [] } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const cookieName = cookieNameForPreview(previewKey);
  const queryRef = {
    sandboxId: request.nextUrl.searchParams.get("sandboxId")?.trim() ?? "",
    previewUrl: request.nextUrl.searchParams.get("previewUrl")?.trim() ?? "",
  };
  const refererRef = extractRefFromReferer(request.headers.get("referer"));
  const cookieRef = parsePersistedRef(request.cookies.get(cookieName)?.value);
  const recoveryRef =
    queryRef.sandboxId && queryRef.previewUrl
      ? { sandboxId: queryRef.sandboxId, previewUrl: queryRef.previewUrl }
      : refererRef ?? cookieRef;

  let entry = previewSandboxes.get(previewKey);
  if (!entry) {
    const apiKey = process.env.E2B_API_KEY?.trim();

    // Recover sandbox binding when this request lands on a fresh server instance.
    if (recoveryRef?.sandboxId && recoveryRef.previewUrl && apiKey) {
      try {
        const sandbox = await Sandbox.connect(recoveryRef.sandboxId, { apiKey });
        entry = { sandbox, previewUrl: recoveryRef.previewUrl, userId: user.id };
        previewSandboxes.set(previewKey, entry);
      } catch {
        // Fall through to user-facing "preview not available" state.
      }
    }
  }

  if (!entry || entry.userId !== user.id) {
    return new Response(
      `<!doctype html><html><body style="font-family:sans-serif;padding:2rem">
        <h3>Preview not available</h3>
        <p>The sandbox session has expired or is still starting up.</p>
        <p>Click <strong>Refresh</strong> in the preview panel to reload.</p>
      </body></html>`,
      { status: 404, headers: { "Content-Type": "text/html" } }
    );
  }

  const { sandbox, previewUrl } = entry;
  const trafficAccessToken = sandbox.trafficAccessToken;

  const targetPath = path.length > 0 ? `/${path.join("/")}` : "/";
  const targetSearch = request.nextUrl.search;
  const targetUrl = `${previewUrl}${targetPath}${targetSearch}`;

  const proxyHeaders: Record<string, string> = {
    "accept-encoding": "identity", // disable compression so we can inject into HTML
  };
  request.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (["host", "connection", "accept-encoding"].includes(k)) return;
    proxyHeaders[key] = value;
  });
  if (trafficAccessToken) {
    proxyHeaders["e2b-traffic-access-token"] = trafficAccessToken;
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      signal: AbortSignal.timeout(30_000),
      redirect: "follow",
      // @ts-expect-error -- Node 18 fetch supports duplex for streaming bodies
      duplex: "half",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      `<!doctype html><html><body style="font-family:sans-serif;padding:2rem">
        <h3>Could not reach preview</h3><p>${msg}</p>
        <p>The dev server may still be starting. Click <strong>Refresh</strong> to try again.</p>
      </body></html>`,
      { status: 502, headers: { "Content-Type": "text/html" } }
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  const contentType = upstream.headers.get("content-type") ?? "";
  const shouldPersistRef = Boolean(recoveryRef?.sandboxId && recoveryRef.previewUrl);
  const persistedValue = recoveryRef ? encodePersistedRef(recoveryRef) : "";

  if (contentType.includes("text/html")) {
    let html = await upstream.text();
    // Inject <base> so every relative URL resolves through this proxy.
    const base = `/api/preview/frame/${previewKey}/`;
    const baseTag = `<base href="${base}">`;
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/(<head[^>]*>)/i, `$1${baseTag}`);
    } else {
      html = baseTag + html;
    }
    html = rewriteRootRelativeAssetUrls(html, base);
    responseHeaders.set("content-type", "text/html; charset=utf-8");
    responseHeaders.delete("content-length");
    if (shouldPersistRef) {
      responseHeaders.append(
        "set-cookie",
        `${cookieName}=${persistedValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`
      );
    }
    return new Response(html, { status: upstream.status, headers: responseHeaders });
  }

  if (shouldPersistRef) {
    responseHeaders.append(
      "set-cookie",
      `${cookieName}=${persistedValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`
    );
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = proxyHandler;
export const POST = proxyHandler;
