import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Optimistic check: Supabase stores session in sb-*-auth-token cookies.
  // We only read cookies here — no network call — per Next.js 16 proxy guidance.
  const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
    .replace('https://', '')
    .split('.')[0];
  const hasSession = request.cookies.has(`sb-${projectRef}-auth-token`) ||
    request.cookies.has(`sb-${projectRef}-auth-token.0`);

  if (!hasSession && pathname.startsWith('/dashboard')) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && (pathname === '/login' || pathname === '/signup')) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
