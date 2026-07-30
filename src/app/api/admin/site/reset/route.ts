import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import {
  deleteCategory,
  deleteDomain,
  deleteMedia,
  deletePost,
  deleteSite,
  listCategoriesBySite,
  listDomainsBySite,
  listMediaBySite,
  listPostsBySite,
  listSitesByOwner,
} from '@/lib/db/queries';

export const runtime = 'edge';

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const db = getDb();
  const sites = await listSitesByOwner(db, session.userId);

  for (const site of sites) {
    const siteId = site.id;

    for (const category of await listCategoriesBySite(db, siteId)) {
      await deleteCategory(db, category.id);
    }

    for (const post of await listPostsBySite(db, siteId)) {
      await deletePost(db, post.id);
    }

    for (const media of await listMediaBySite(db, siteId)) {
      await deleteMedia(db, media.id);
    }

    for (const domain of await listDomainsBySite(db, siteId)) {
      await deleteDomain(db, domain.id);
    }

    await db.settings.delete(siteId);
    await deleteSite(db, siteId);
  }

  return NextResponse.json({ success: true });
}
