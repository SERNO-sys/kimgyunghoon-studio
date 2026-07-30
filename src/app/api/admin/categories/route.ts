import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import {
  getSettingsBySiteId,
  listCategoriesBySite,
  listSitesByOwner,
} from '@/lib/db/queries';
import { parseSettings, resolvePages } from '@/lib/site-context';
import type { Category } from '@/lib/db/types';

export const runtime = 'edge';

async function getCurrentSiteId(userId: string): Promise<string | null> {
  const db = getDb();
  const sites = await listSitesByOwner(db, userId);
  return sites[0]?.id ?? null;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const siteId = await getCurrentSiteId(session.userId);
  if (!siteId) {
    return NextResponse.json(
      { success: false, message: 'No site configured' },
      { status: 404 }
    );
  }

  const db = getDb();
  const categories: Category[] = [];
  const settings = await getSettingsBySiteId(db, siteId);
  if (settings) {
    const parsed = parseSettings(settings);
    const pages = resolvePages(parsed.pages, '');
    const allowedTypes = new Set(['music', 'diary', 'custom']);
    pages.forEach((page) => {
      if (!allowedTypes.has(page.type)) {
        return;
      }
      const isCustom = page.type === 'custom';
      const title = isCustom ? page.label : page.type.toUpperCase();
      const slug = isCustom ? page.path.replace(/^\//, '') : page.type;
      categories.push({
        id: page.id,
        siteId,
        title,
        slug,
        order: page.order,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  }

  if (categories.length === 0) {
    const dbCategories = await listCategoriesBySite(db, siteId);
    return NextResponse.json({ success: true, categories: dbCategories });
  }

  return NextResponse.json({ success: true, categories });
}
