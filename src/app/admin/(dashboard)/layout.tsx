import { redirect } from 'next/navigation';

import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import { listSitesByOwner } from '@/lib/db/queries';
import { getEnv } from '@/config/env';
import { AdminShell } from '@/components/admin/layout/AdminShell';

export const runtime = 'edge';

/**
 * Derives a short, URL-safe tenant subdomain from a site id (UUID). For a site
 * id like `e801f11c-xxxx-xxxx-xxxx-xxxxxxxxxxxx` this returns `e801f11c`.
 */
function deriveSubdomain(siteId: string): string {
  const first = siteId.split('-')[0];
  return first || siteId;
}

export default async function AdminDashboardLayout({

  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }

  const db = getDb();
  const sites = await listSitesByOwner(db, session.userId);

  if (sites.length === 0) {
    redirect('/admin/setup');
  }

  const site = sites[0];

  // Build the public site URL as a tenant subdomain of the fixed platform
  // domain (e.g. https://e801f11c.lucidworker.com). We intentionally do NOT
  // reuse the stored primary domain because it may be a nested *.pages.dev
  // subdomain (e.g. <siteId>.kimgyunghoon-studio.pages.dev) which is not a
  // valid public tenant URL. Local dev falls back to the in-app preview route.
  let appDomain = 'lucidworker.com';
  try {
    appDomain = getEnv().NEXT_PUBLIC_APP_DOMAIN || 'lucidworker.com';
  } catch {
    // Ignore env resolution failures and fall back to the default domain.
  }

  const isLocalDev = appDomain === 'localhost' || appDomain.includes('.localhost');

  const siteUrl = isLocalDev
    ? `/sites/${site.id}`
    : `https://${deriveSubdomain(site.id)}.${appDomain}`;

  return (
    <AdminShell siteName={site.name} siteUrl={siteUrl}>
      {children}
    </AdminShell>
  );
}


