type RequestLike = Request | { url: string; headers: Headers };

function sanitizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, "");
}

export function getAppUrl(request?: RequestLike): string {
  if (request) {
    const proto = request.headers.get("x-forwarded-proto");
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (host) {
      const protocol = proto ?? "http";
      return sanitizeOrigin(`${protocol}://${host}`);
    }
    try {
      return sanitizeOrigin(new URL(request.url).origin);
    } catch {
      // fall through to env-based fallback
    }
  }

  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  return sanitizeOrigin(envUrl ?? "http://localhost:3000");
}
