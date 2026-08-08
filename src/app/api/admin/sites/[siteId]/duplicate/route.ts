import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import {
  createDomain,
  duplicateSite,
  getSiteById,
  getSiteByDomain,
  getSettingsBySiteId,
  upsertSettings,
} from '@/lib/db/queries';
import { getDefaultPages, resolvePages } from '@/lib/site-context';
import type { SiteSettings } from '@/lib/db/types';

export const runtime = 'edge';

/**
 * Phase 20.5: Duplicate Project.
 *
 * Clones an existing project's design (ThemeConfig + settings + pages) into a
 * brand-new, independent Site. The source ThemeConfig is the immutable SSOT —
 * it is READ and copied verbatim, never mutated. The new project gets a fresh
 * id, a fresh subdomain, and a " (복사본)" name suffix so it is fully
 * independent of the source.
 *
 * ARCHITECTURAL BOUNDARY:
 *   - Thin WRAPPER (Buy Before Build). Reuses the existing duplicateSite /
 *     upsertSettings / createDomain queries. No Core changes.
 *   - The client is a Dumb Client: it only POSTs the source siteId and
 *     redirects to the new project. It never composes or mutates ThemeConfig.
 *   - Content/infra (domains, posts, media, deploy versions) are intentionally
 *     NOT copied — each project owns its own subdomain and content. Only the
 *     design surface is duplicated.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { siteId } = await params;
  const db = getDb();
  const source = await getSiteById(db, siteId);

  if (!source) {
    return NextResponse.json(
      { success: false, message: 'Site not found' },
      { status: 404 }
    );
  }

  // Only the site owner may duplicate this site.
  if (source.ownerId !== session.userId) {
    return NextResponse.json(
      { success: false, message: 'Forbidden' },
      { status: 403 }
    );
  }

  try {
    // The new project starts as a Draft with a fresh subdomain. The design
    // (ThemeConfig + settings + pages) is copied; content/infra is not.
    const newName = `${source.name} (복사본)`.slice(0, 50);
    const newDescription = source.description;

    const copy = await duplicateSite(db, source, newName, newDescription);
    const newId = copy.id;
    const subdomain = newId.split('-')[0] || newId;

    const hostname = new URL(request.url).hostname;
    const defaultDomain =
      hostname === 'localhost'
        ? `${subdomain}.localhost`
        : `${subdomain}.${hostname}`;

    if (await getSiteByDomain(db, defaultDomain)) {
      return NextResponse.json(
        { success: false, message: 'Site domain already exists' },
        { status: 409 }
      );
    }

    await createDomain(db, {
      id: crypto.randomUUID(),
      siteId: newId,
      domain: defaultDomain,
      verified: true,
      isPrimary: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Copy the source settings (general/contact/analytics/social/pages) into
    // the new project so the design surface is preserved. The settings row is
    // keyed by siteId, so we re-key it to the new id.
    const sourceSettings = await getSettingsBySiteId(db, siteId);
    if (sourceSettings) {
      const pages = resolvePages(
        safeJsonParse(sourceSettings.pages, []),
        newName
      );
      const settings: SiteSettings = {
        id: newId,
        siteId: newId,
        general: sourceSettings.general,
        contact: sourceSettings.contact,
        analytics: sourceSettings.analytics,
        social: sourceSettings.social,
        pages: JSON.stringify(pages),
        updatedAt: new Date().toISOString(),
      };
      await upsertSettings(db, settings);
    } else {
      // No source settings — seed the new project with default pages so the
      // preview renders a coherent navigation.
      const settings: SiteSettings = {
        id: newId,
        siteId: newId,
        general: JSON.stringify({ name: newName, description: newDescription }),
        contact: '{}',
        analytics: '{}',
        social: '{}',
        pages: JSON.stringify(getDefaultPages(newName)),
        updatedAt: new Date().toISOString(),
      };
      await upsertSettings(db, settings);
    }

    return NextResponse.json({
      success: true,
      message: '프로젝트가 복제되었습니다.',
      siteId: newId,
      domain: defaultDomain,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to duplicate site';
    console.error('[DuplicateSite] error:', error);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

/** Parses a JSON string safely, falling back to the provided default. */
function safeJsonParse(value: string, fallback: unknown): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
