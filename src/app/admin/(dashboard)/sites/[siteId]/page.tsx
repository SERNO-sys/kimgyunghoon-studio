import { notFound, redirect } from 'next/navigation';

import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import {
  getPrimaryDomain,
  getSettingsBySiteId,
  getSiteById,
} from '@/lib/db/queries';

import { getEnv } from '@/config/env';
import type { AiDesignReport } from '@/types/site';
import { SitePreviewPage } from './page.client';


export const runtime = 'edge';

/**
 * Derives a short, URL-safe tenant subdomain from a site id (UUID). For a site
 * id like `e801f11c-xxxx-xxxx-xxxx-xxxxxxxxxxxx` this returns `e801f11c`.
 */
function deriveSubdomain(siteId: string): string {
  const first = siteId.split('-')[0];
  return first || siteId;
}

export default async function AdminSitePreviewPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }

  const db = getDb();
  const site = await getSiteById(db, siteId);

  // Only the owner (or an admin) may view this site's preview.
  if (!site || site.ownerId !== session.userId) {
    notFound();
  }

  const settings = await getSettingsBySiteId(db, siteId);
  const primary = await getPrimaryDomain(db, siteId);

  // Build the public site URL as a tenant subdomain of the fixed platform
  // domain (e.g. https://e801f11c.lucidworker.com). Local dev falls back to
  // the in-app preview route.
  let appDomain = 'lucidworker.com';
  try {
    appDomain = getEnv().NEXT_PUBLIC_APP_DOMAIN || 'lucidworker.com';
  } catch {
    // Ignore env resolution failures and fall back to the default domain.
  }

  const isLocalDev = appDomain === 'localhost' || appDomain.includes('.localhost');

  const publicUrl = isLocalDev
    ? `/sites/${site.id}`
    : `https://${deriveSubdomain(site.id)}.${appDomain}`;

  // The preview iframe always points at the in-app preview route so the admin
  // sees the latest draft state regardless of publish status.
  const previewUrl = `/sites/${site.id}`;

  // AWIE Decision Engine (V2): surface the AI's design rationale so the user
  // trusts that the site was designed from an analysis of their business.
  const aiDesignReport: AiDesignReport | null =
    site.themeConfig?.aiDesignReport ?? null;

  return (
    <SitePreviewPage
      siteId={site.id}
      siteName={site.name}
      siteDescription={site.description}
      isPublished={site.isPublished}
      deployVersion={site.deployVersion}
      publicUrl={publicUrl}
      previewUrl={previewUrl}
      primaryDomain={primary?.domain ?? null}
      aiDesignReport={aiDesignReport}
    />
  );
}


