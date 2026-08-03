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
 * while the original tenant subdomain is carried in a proxy/CDN header. We
 * check, in order:
 *   1. `x-original-host`  (set by some proxies/CDNs)
 *   2. `x-forwarded-host` (set by CDNs/proxies)
 *   3. `host`             (the Host header)
 *   4. `nextUrl.hostname` (fallback)
 * The port is stripped (e.g. `localhost:3000` -> `localhost`).
 */
function resolveHostname(request: NextRequest): string {
  const originalHost = request.headers.get('x-original-host');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = request.headers.get('host');

  // `x-forwarded-host` may contain a comma-separated list of hosts (e.g.
  // `a.lucidworker.com, b.lucidworker.com`). Take the first entry only.
  const firstForwarded = forwardedHost?.split(',')[0]?.trim();

  const candidate =
    originalHost || firstForwarded || hostHeader || request.nextUrl.hostname;

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

  // Safety guard: if the incoming path already carries the `/sites/<siteId>`
  // prefix (e.g. a stale link or a direct navigation to the internal route),
  // do NOT double-prefix it. This prevents `/sites/<id>/sites/<id>/...` 404s.
  if (pathname === base || pathname.startsWith(`${base}/`)) {
    return pathname;
  }

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
    xOriginalHost: request.headers.get('x-original-host'),
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

  // Internal tenant preview routes (`/sites/<siteId>`) are used as the iframe
  // src for the admin "미리보기" panel. They must ALWAYS render the tenant site
  // (never the admin dashboard), so on the main domain we pass them straight
  // through to the `/sites/[siteId]` route. This guard is intentionally placed
  // before tenant resolution so a logged-in admin's preview iframe can never be
  // mistaken for an admin route or rewritten to the platform landing page.
  if (pathname.startsWith('/sites/')) {
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

  // The Cloudflare Pages project domain is treated as a platform/development
  // host so the default pages.dev URL and preview deployments render the main
  // platform page instead of "Site not found".
  const pagesProjectHost = 'kimgyunghoon-studio.pages.dev';

  // STRICT main-domain detection. Only the exact platform host, its `www`
  // alias, the Pages project domain, and localhost are treated as the main
  // platform. Tenant subdomains (*.lucidworker.com) and user custom domains are
  // NEVER the main domain.
  const isMainDomain =
    hostname === platformHost ||
    hostname === `www.${platformHost}` ||
    hostname === pagesProjectHost ||
    hostname.endsWith(`.${pagesProjectHost}`) ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1';

  console.log('[Middleware] Is Main Domain:', isMainDomain);

  // Non-main-domain host: a tenant subdomain (*.lucidworker.com) or a user's
  // custom domain. NEVER send these to the platform landing page. Resolve the
  // site via D1 and rewrite to the tenant route (/sites/<siteId>).
  if (!isMainDomain) {
    let site = null;
    let subdomain: string | null = null;

    try {
      const db = getDb();

      // 1) Try an exact custom-domain match (e.g. a user's own domain).
      site = await getSiteByDomain(db, hostname);

      // 2) Fall back to a platform subdomain match. The subdomain is the first
      //    segment of the site's UUID (e.g. `e801f11c` for
      //    `e801f11c.lucidworker.com`), which is not stored verbatim in the
      //    domains table, so we resolve it against the sites table.
      subdomain = extractSubdomain(hostname, platformHost);
      console.log('[Middleware Log] extractSubdomain:', subdomain);
      if (!site && subdomain) {
        site = await getSiteBySubdomain(db, subdomain);
      }
    } catch {
      // A DB error (e.g. D1 timeout) must never surface as a 522. Treat the
      // host as unknown so the request falls through to a fast 404 below.
      site = null;
    }

    if (site) {
      // Rewrite to the tenant route so the site renders via /sites/<siteId>.
      // NOTE: we intentionally do NOT gate on `isPublished` here. The publish
      // flow already flips `is_published` to true, but a freshly autobuilt site
      // must be reachable on its tenant subdomain immediately (the admin
      // preview iframe and the public URL both hit this path). Treating an
      // unpublished site as 404 caused "Site not found" on valid subdomains.
      const tenantPath = mapTenantPath(pathname, site.id);
      console.log('[Middleware Log] resolved tenant site:', site.id, '-> rewrite to', tenantPath);
      console.log('[Middleware] Rewriting to:', tenantPath);

      const response = NextResponse.rewrite(new URL(tenantPath, request.url));

      response.headers.set('x-site-id', site.id);
      response.headers.set('x-site-domain', hostname);
      if (subdomain) {
        response.headers.set('x-site-subdomain', subdomain);
      }
      return response;
    }


    // Unknown custom domain: return a minimal not-configured response. NEVER
    // redirect/rewrite to the main page when the site is not found.
    console.log('[Middleware Log] no site resolved, returning 404');
    return new NextResponse('Site not found', { status: 404 });
  }

  // Main domain: rewrite root to platform landing page.
  if (pathname === '/') {
    console.log('[Middleware Log] main domain, rewriting / -> /platform');
    return NextResponse.rewrite(new URL('/platform', request.url));
  }

  console.log('[Middleware Log] main domain, next()');
  return NextResponse.next();
}
