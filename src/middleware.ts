import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getEnv } from '@/config/env';
import { getSessionFromRequest } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import { getSiteByDomain } from '@/lib/db/queries';

export const config = {
  matcher: [
    '/',
    '/about',
    '/contact',
    '/diary/:path*',
    '/music/:path*',
    '/admin/:path*',
  ],
};

function isPlatformHost(hostname: string, platformHost: string): boolean {
  if (hostname === platformHost) return true;
  if (platformHost.startsWith('.') && hostname.endsWith(platformHost)) return true;
  return false;
}

const ADMIN_PUBLIC_PATHS = new Set(['/admin/login', '/admin/setup']);

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  // Admin routes: enforce authentication and onboarding.
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }

    const session = await getSessionFromRequest(request);
    if (!session) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Allow public admin paths; dashboard layout handles site ownership check.
    if (ADMIN_PUBLIC_PATHS.has(pathname)) {
      return NextResponse.next();
    }

    return NextResponse.next();
  }

  // Public tenant routes: resolve site by custom domain and attach headers.
  let platformHost = 'localhost';
  try {
    platformHost = getEnv().PLATFORM_HOST || 'localhost';
  } catch {
    // If env resolution fails, fall back to treating this request as the
    // platform host so the public site still renders instead of 500/404.
  }

  // If PLATFORM_HOST is still the unconfigured default, treat every request
  // as the platform host (no custom-domain resolution) so the site boots.
  const platformConfigured = platformHost !== 'localhost';

  if (platformConfigured && !isPlatformHost(hostname, platformHost)) {
    const db = getDb();
    const site = await getSiteByDomain(db, hostname);

    if (site) {
      const response = NextResponse.next();
      response.headers.set('x-site-id', site.id);
      response.headers.set('x-site-domain', hostname);
      return response;
    }

    // Unknown custom domain: return a minimal not-configured response.
    return new NextResponse('Site not configured', { status: 404 });
  }

  // Platform host: rewrite root to platform landing page.
  if (pathname === '/') {
    return NextResponse.rewrite(new URL('/platform', request.url));
  }

  return NextResponse.next();
}

