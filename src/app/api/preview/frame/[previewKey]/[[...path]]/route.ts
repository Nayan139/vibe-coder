import type { NextRequest } from "next/server";
import { previewSandboxes } from "@/lib/e2b-preview-store";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { previewKey: string; path?: string[] };

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

  const entry = previewSandboxes.get(previewKey);
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
    responseHeaders.set("content-type", "text/html; charset=utf-8");
    responseHeaders.delete("content-length");
    return new Response(html, { status: upstream.status, headers: responseHeaders });
  }

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = proxyHandler;
export const POST = proxyHandler;
