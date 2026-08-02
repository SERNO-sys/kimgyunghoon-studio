import { redirect } from 'next/navigation';

import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import { getPrimaryDomain, listSitesByOwner } from '@/lib/db/queries';
import { AdminShell } from '@/components/admin/layout/AdminShell';

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
  // Local dev fallback: avoid *.localhost subdomain routing issues.
  const siteUrl =
    primaryDomain?.domain && !primaryDomain.domain.includes('.localhost')
      ? `http://${primaryDomain.domain}`
      : `/sites/${site.id}`;

  return (
    <AdminShell siteName={site.name} siteUrl={siteUrl}>
      {children}
    </AdminShell>
  );
}
