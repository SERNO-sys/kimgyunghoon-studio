import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import {
  getSettingsBySiteId,
  listSitesByOwner,
  upsertSettings,
} from '@/lib/db/queries';
import type { SitePage, SiteSettings } from '@/lib/db/types';

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
  const settings = await getSettingsBySiteId(db, siteId);
  const pages: SitePage[] = settings?.pages ? JSON.parse(settings.pages) : [];

  return NextResponse.json({ success: true, pages });
}

export async function POST(request: Request) {
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

  try {
    const body = (await request.json()) as { pages?: SitePage[] };
    const pages = Array.isArray(body.pages) ? body.pages.slice(0, 8) : [];

    const db = getDb();
    const existing = await getSettingsBySiteId(db, siteId);
    const settings: SiteSettings = {
      id: siteId,
      siteId,
      general: existing?.general ?? '{}',
      contact: existing?.contact ?? '{}',
      analytics: existing?.analytics ?? '{}',
      social: existing?.social ?? '{}',
      pages: JSON.stringify(pages),
      updatedAt: new Date().toISOString(),
    };
    await upsertSettings(db, settings);

    return NextResponse.json({ success: true, pages });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to save pages' },
      { status: 500 }
    );
  }
}
