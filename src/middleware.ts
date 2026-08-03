import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getEnv } from '@/config/env';
import { getSessionFromRequest } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import { getSiteByDomain, getSiteBySubdomain } from '@/lib/db/queries';


export const config = {
  matcher: [
    // Match every path (including the root `/`) so that subdomain-based
    // multi-tenant resolution runs for all public routes. Exclude API routes,
    // Next.js internals, and static assets.
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};


/**
 * Resolves the effective hostname for a request.
 *
 * In Cloudflare Pages / Worker environments the `host` header may be
 * overwritten to the Pages project domain (e.g. kimgyunghoon-studio.pages.dev)
 * while `x-forwarded-host` carries the original tenant subdomain. Prefer
 * `x-forwarded-host` first, then `host`, and finally `nextUrl.hostname`.
 * The port is stripped (e.g. `localhost:3000` -> `localhost`).
 */
function resolveHostname(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = request.headers.get('host');

  const candidate = forwardedHost || hostHeader || request.nextUrl.hostname;

  // Strip any port (e.g. `localhost:3000` -> `localhost`) and lowercase.
  return candidate.split(':')[0].toLowerCase();
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


/**
 * Maps an incoming tenant path (e.g. `/`, `/about`, `/posts/hello`) to the
 * corresponding `/sites/<siteId>` route so the tenant site renders through the
 * dedicated tenant routes regardless of the incoming host.
 */
function mapTenantPath(pathname: string, siteId: string): string {
  const base = `/sites/${siteId}`;

  // Root -> tenant home.
  if (pathname === '/' || pathname === '') {
    return base;
  }

  // Static tenant pages that have dedicated routes.
  const staticPages = ['/about', '/contact', '/diary', '/music'];
  for (const page of staticPages) {
    if (pathname === page) {
      return `${base}${page}`;
    }
  }

  // Nested static pages (e.g. /diary/<slug>, /music/<slug>, /posts/<slug>).
  const nestedPrefixes = ['/diary/', '/music/', '/posts/'];
  for (const prefix of nestedPrefixes) {
    if (pathname.startsWith(prefix)) {
      return `${base}${pathname}`;
    }
  }

  // Any other path (custom page, category, etc.) maps under the tenant base.
  // The `/sites/[siteId]/[...slug]` catch-all route handles custom pages and
  // `/sites/[siteId]/[category]` handles category listings.
  return `${base}${pathname}`;
}


const ADMIN_PUBLIC_PATHS = new Set(['/admin/login', '/admin/setup']);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // [Middleware Request Host] Log the exact Host values seen by the middleware
  // so we can confirm which header carries the original tenant subdomain in the
  // Cloudflare Pages / wildcard Worker environment.
  console.log('[Middleware Request Host]', {
    host: request.headers.get('host'),
    xForwardedHost: request.headers.get('x-forwarded-host'),
    url: request.url,
  });

  // Resolve the effective hostname from the original Host header (preserved by
  // the wildcard proxy Worker) rather than request.nextUrl.hostname, which can
  // be the Pages project domain after proxying.
  const hostname = resolveHostname(request);

  // [Middleware] Debug the extracted host at request time.
  console.log('[Middleware] Extracted Host:', hostname);
  console.log('[Middleware Log] nextUrl.hostname:', request.nextUrl.hostname);


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
  // PLATFORM_HOST defaults to the production platform host (lucidworker.com) in
  // env.ts, so even if the env var is missing in the Pages dashboard we still
  // resolve tenant subdomains instead of treating every request as the platform.
  let platformHost = 'lucidworker.com';
  try {
    platformHost = getEnv().PLATFORM_HOST || 'lucidworker.com';
  } catch {
    // If env resolution fails, keep the production platform host so tenant
    // subdomains are still resolved (never fall back to 'localhost').
  }

  console.log('[Middleware Log] platformHost:', platformHost);
  console.log('[Middleware Log] process.env.PLATFORM_HOST:', process.env.PLATFORM_HOST);

  // STRICT main-domain detection. Only the exact platform host, its `www`
  // alias, and localhost are treated as the main platform. Tenant subdomains
  // (*.lucidworker.com) and user custom domains are NEVER the main domain.
  const isMainDomain =
    hostname === platformHost ||
    hostname === `www.${platformHost}` ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1';

  console.log('[Middleware] Is Main Domain:', isMainDomain);

  // =========================================================================
  // KILL SWITCH / DIAGNOSTIC
  // -------------------------------------------------------------------------
  // Confirms the middleware actually runs and detects the tenant subdomain
  // BEFORE any D1 lookup. If you visit a tenant subdomain and see the text
  // below in the browser, the middleware runs and host detection works, and
  // the remaining issue is in the D1 lookup / rewrite. If you still see the
  // main platform page, the middleware is not running for that host.
  // =========================================================================
  if (!isMainDomain) {
    console.log('=== SUBDOMAIN DETECTED ===', hostname);
    return new NextResponse(
      `[Middleware Kill-Switch] SUBDOMAIN DETECTED: ${hostname}\n` +
        `pathname: ${pathname}\n` +
        `isMainDomain: ${isMainDomain}\n` +
        `platformHost: ${platformHost}\n` +
        `nextUrl.hostname: ${request.nextUrl.hostname}\n` +
        `host header: ${request.headers.get('host')}\n` +
        `x-forwarded-host: ${request.headers.get('x-forwarded-host')}`,
      { status: 200, headers: { 'content-type': 'text/plain' } }
    );
  }

  // Main domain: rewrite root to platform landing page.
  if (pathname === '/') {
    console.log('[Middleware Log] main domain, rewriting / -> /platform');
    return NextResponse.rewrite(new URL('/platform', request.url));
  }

  console.log('[Middleware Log] main domain, next()');
  return NextResponse.next();
}
