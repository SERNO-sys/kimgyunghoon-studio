import { NextResponse, type NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/admin/session';

const STATIC_PATHS = [
  '/_next',
  '/static',
  '/favicon.ico',
  '/icon.svg',
  '/sitemap.xml',
  '/robots.txt',
];

function isMainDomain(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  const main = process.env.MAIN_DOMAIN?.toLowerCase();
  if (!main) return false;
  return hostname === main || hostname === `www.${main}`;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase();
  const { pathname, search } = request.nextUrl;

  // 1. Static / API requests skip middleware entirely.
  if (
    pathname.startsWith('/api') ||
    STATIC_PATHS.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next();
  }

  // 2. Admin routes require a valid session, except login and setup pages.
  if (pathname.startsWith('/admin')) {
    const isPublicAdmin =
      pathname === '/admin/login' ||
      pathname === '/admin/setup' ||
      pathname.startsWith('/admin/login/') ||
      pathname.startsWith('/admin/setup/');

    if (!isPublicAdmin) {
      const session = await getSessionFromRequest(request);
      if (!session) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
    }
    return NextResponse.next();
  }

  // 3. Main domain root should go to the admin dashboard, not the public site.
  if (isMainDomain(hostname) && pathname === '/') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // 4. Custom domain routing: rewrite to /sites/[siteId] while preserving the URL.
  try {
    const resolveUrl = new URL('/api/resolve-domain', request.url);
    resolveUrl.searchParams.set('host', hostname);
    const response = await fetch(resolveUrl.toString(), {
      headers: { host: hostname },
    });
    const data = (await response.json()) as { siteId?: string | null };

    if (data.siteId) {
      const rewriteUrl = new URL(
        `/sites/${data.siteId}${pathname}${search}`,
        request.url
      );
      return NextResponse.rewrite(rewriteUrl);
    }
  } catch {
    // If the lookup fails, continue to the normal route.
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
