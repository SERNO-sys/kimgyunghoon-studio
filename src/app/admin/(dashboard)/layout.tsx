import { redirect } from 'next/navigation';

import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import { getPrimaryDomain, listSitesByOwner } from '@/lib/db/queries';
import { getEnv } from '@/config/env';
import { AdminShell } from '@/components/admin/layout/AdminShell';

export const runtime = 'edge';

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
  const primaryDomain = await getPrimaryDomain(db, site.id);

  // Build the public site URL. When the primary domain is a subdomain of the
  // platform host (e.g. <siteId>.lucidworker.com) we point the "View Public
  // Site" link at the https subdomain URL. Custom domains are also served over
  // https. Local dev falls back to the in-app preview route.
  let platformHost = 'localhost';
  try {
    platformHost = getEnv().PLATFORM_HOST || 'localhost';
  } catch {
    // Ignore env resolution failures and fall back to the preview route.
  }

  const domain = primaryDomain?.domain;
  const isLocalSubdomain =
    domain && (domain.includes('.localhost') || domain.endsWith('.pages.dev'));

  let siteUrl: string;
  if (domain && !isLocalSubdomain) {
    siteUrl = `https://${domain}`;
  } else {
    siteUrl = `/sites/${site.id}`;
  }

  return (
    <AdminShell siteName={site.name} siteUrl={siteUrl}>
      {children}
    </AdminShell>
  );
}

