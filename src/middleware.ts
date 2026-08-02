import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getEnv } from '@/config/env';
import { getSessionFromRequest } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import { getSiteByDomain, getSiteBySubdomain } from '@/lib/db/queries';


export const config = {
  matcher: [
    // Match every path so that subdomain-based multi-tenant resolution runs
    // for all public routes, including user-created custom pages (e.g.
    // /portfolio, /notice) and the admin dashboard.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};


function isPlatformHost(hostname: string, platformHost: string): boolean {
  // Local development.
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

  // Exact configured platform host (e.g. lucidworker.com).
  if (hostname === platformHost) return true;

  // Subdomains of a dotted platform host.
  if (platformHost.startsWith('.') && hostname.endsWith(platformHost)) return true;

  // Any Cloudflare Pages domain (base + preview deployments like
  // <hash>.kimgyunghoon-studio.pages.dev) is treated as the platform host so
  // preview URLs and the default pages.dev domain render the main site instead
  // of "Site not configured".
  if (hostname.endsWith('.pages.dev')) return true;

  return false;
}

/**
 * Extracts the subdomain portion of a hostname relative to the platform host.
 * For `[subdomain].lucidworker.com` with platform host `lucidworker.com` this
 * returns `subdomain`. Returns null when the host is the platform host itself
 * or is not a subdomain of it.
 */
function extractSubdomain(hostname: string, platformHost: string): string | null {
  const normalizedHost = platformHost.startsWith('.')
    ? platformHost.slice(1)
    : platformHost;

  if (hostname === normalizedHost) return null;

  const suffix = `.${normalizedHost}`;
  if (hostname.endsWith(suffix)) {
    const subdomain = hostname.slice(0, -suffix.length);
    // Reject empty or nested subdomains (e.g. `a.b.lucidworker.com`).
    if (subdomain && !subdomain.includes('.')) return subdomain;
  }

  return null;
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

    // 1) Try an exact custom-domain match (e.g. a user's own domain).
    let site = await getSiteByDomain(db, hostname);

    // 2) Fall back to a platform subdomain match. The subdomain is the first
    //    segment of the site's UUID (e.g. `e801f11c` for
    //    `e801f11c.lucidworker.com`), which is not stored verbatim in the
    //    domains table, so we resolve it against the sites table.
    const subdomain = extractSubdomain(hostname, platformHost);
    if (!site && subdomain) {
      site = await getSiteBySubdomain(db, subdomain);
    }

    if (site) {
      const response = NextResponse.next();
      response.headers.set('x-site-id', site.id);
      response.headers.set('x-site-domain', hostname);
      if (subdomain) {
        response.headers.set('x-site-subdomain', subdomain);
      }
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
