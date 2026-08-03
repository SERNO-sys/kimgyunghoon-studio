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


/**
 * Resolves the effective hostname for a request.
 *
 * In Cloudflare Pages the request may arrive through the wildcard proxy Worker
 * (workers/wildcard-proxy.js), which forwards to the Pages project URL
 * (e.g. kimgyunghoon-studio.pages.dev) while preserving the original `Host`
 * header. `request.nextUrl.hostname` is built from the URL used to reach the
 * Pages project, so it can be the Pages domain rather than the tenant
 * subdomain (e.g. 50bd00da.lucidworker.com).
 *
 * To reliably detect the tenant subdomain we must prefer the original `Host`
 * header, then `x-forwarded-host` (set by CDNs/proxies), and only fall back to
 * `nextUrl.hostname` when neither is available.
 */
function resolveHostname(request: NextRequest): string {
  // In Cloudflare Pages / Worker environments the `host` header may be
  // overwritten to the Pages project domain (e.g. kimgyunghoon-studio.pages.dev)
  // while `x-forwarded-host` carries the original tenant subdomain. Prefer
  // `x-forwarded-host` first, then `host`, and finally `nextUrl.hostname`.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = request.headers.get('host');

  const candidate = forwardedHost || hostHeader || request.nextUrl.hostname;

  // Strip any port (e.g. `localhost:3000` -> `localhost`) and lowercase.
  return candidate.split(':')[0].toLowerCase();
}



/**
 * Determines whether a hostname is the main platform host.
 *
 * STRICT rule: only the exact platform domain (lucidworker.com), its `www`
 * alias, localhost (dev), and Cloudflare Pages preview domains are treated as
 * the platform. Any tenant subdomain (*.lucidworker.com) or a user's custom
 * domain is NEVER the platform host and must be resolved to a tenant site.
 */
function isPlatformHost(hostname: string, platformHost: string): boolean {
  // Local development.
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

  // Exact configured platform host (e.g. lucidworker.com).
  if (hostname === platformHost) return true;

  // The `www` alias of the platform host (e.g. www.lucidworker.com) is treated
  // as the platform host itself so it renders the main landing page instead of
  // "Site not configured".
  if (hostname === `www.${platformHost}`) return true;

  // Any Cloudflare Pages domain (base + preview deployments like
  // <hash>.kimgyunghoon-studio.pages.dev) is treated as the platform host so
  // preview URLs and the default pages.dev domain render the main site instead
  // of "Site not configured".
  if (hostname.endsWith('.pages.dev')) return true;

  // A tenant subdomain of the platform host (e.g. <siteId>.lucidworker.com) is
  // NOT the platform host. It must be resolved to a tenant site below.
  if (extractSubdomain(hostname, platformHost) !== null) return false;

  // Any other host (e.g. a user's custom domain mycompany.com) is NOT the
  // platform host. It must be resolved to a tenant site below.
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

  // The platform host is always configured in production. Treat every request
  // as the platform host only when the host is actually the platform itself.
  const platformConfigured = platformHost !== 'localhost';

  const isPlatform = isPlatformHost(hostname, platformHost);
  const isMainDomain = isPlatform;
  console.log('[Middleware Log] isPlatformHost:', isPlatform);
  console.log('[Middleware] Is Main Domain:', isMainDomain);

  // Non-platform host: a tenant subdomain (*.lucidworker.com) or a user's
  // custom domain. NEVER send these to the platform landing page. Resolve the
  // site via D1 and rewrite to the tenant route (/sites/<siteId>).
  if (platformConfigured && !isPlatform) {

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
      // Unpublished sites are treated as missing so the public subdomain/custom
      // domain does not leak draft data. Return a fast 404 instead of 522.
      if (!site.isPublished) {
        console.log('[Middleware Log] site found but unpublished, returning 404');
        return new NextResponse('Site not found', { status: 404 });
      }

      // Rewrite to the tenant route so the site renders via /sites/<siteId>.
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

    // Unknown custom domain: return a minimal not-configured response.
    console.log('[Middleware Log] no site resolved, returning 404');
    return new NextResponse('Site not found', { status: 404 });
  }



  // Platform host: rewrite root to platform landing page.
  if (pathname === '/') {
    console.log('[Middleware Log] platform host, rewriting / -> /platform');
    return NextResponse.rewrite(new URL('/platform', request.url));
  }

  console.log('[Middleware Log] platform host, next()');
  return NextResponse.next();
}
