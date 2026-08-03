import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import {
  deleteSite,
  getSiteById,
  listCategoriesBySite,
  listDeployVersionsBySite,
  listDomainsBySite,
  listMediaBySite,
  listPostsBySite,
} from '@/lib/db/queries';

export const runtime = 'edge';

/**
 * Deletes a site and ALL of its related records (domains, posts, media,
 * categories, settings, deploy versions) so the user can start fresh from a
 * clean slate. Only the site owner (or an admin) may delete a site.
 */
export async function DELETE(
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
  const site = await getSiteById(db, siteId);

  if (!site) {
    return NextResponse.json(
      { success: false, message: 'Site not found' },
      { status: 404 }
    );
  }

  // Only the site owner may delete this site.
  if (site.ownerId !== session.userId) {
    return NextResponse.json(
      { success: false, message: 'Forbidden' },
      { status: 403 }
    );
  }

  try {
    // Delete all related records first (foreign-key-safe order).
    const domains = await listDomainsBySite(db, siteId);
    for (const d of domains) await db.domains.delete(d.id);

    const posts = await listPostsBySite(db, siteId);
    for (const p of posts) await db.posts.delete(p.id);

    const media = await listMediaBySite(db, siteId);
    for (const m of media) await db.media.delete(m.id);

    const categories = await listCategoriesBySite(db, siteId);
    for (const c of categories) await db.categories.delete(c.id);

    const deployVersions = await listDeployVersionsBySite(db, siteId);
    for (const v of deployVersions) await db.deployVersions.delete(v.id);

    // Settings row uses the site id as its primary key.
    await db.settings.delete(siteId);

    // Finally delete the site itself.
    const deleted = await deleteSite(db, siteId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Failed to delete site' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '사이트가 삭제되었습니다.',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete site';
    console.error('[DeleteSite] error:', error);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
