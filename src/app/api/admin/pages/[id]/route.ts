import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import {
  getSettingsBySiteId,
  listSitesByOwner,
  upsertSettings,
} from '@/lib/db/queries';
import { resolvePages } from '@/lib/site-context';
import type { SitePage, SiteSettings } from '@/lib/db/types';

export const runtime = 'edge';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function getCurrentSiteId(userId: string): Promise<string | null> {
  const db = getDb();
  const sites = await listSitesByOwner(db, userId);
  return sites[0]?.id ?? null;
}

async function loadPages(siteId: string): Promise<SitePage[]> {
  const db = getDb();
  const settings = await getSettingsBySiteId(db, siteId);
  const parsedPages = settings?.pages ? JSON.parse(settings.pages) : [];
  return resolvePages(parsedPages, '');
}

async function savePages(siteId: string, pages: SitePage[]): Promise<void> {
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
}

export async function GET(_request: Request, { params }: RouteParams) {
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

  const { id } = await params;
  const pages = await loadPages(siteId);
  const page = pages.find((p) => p.id === id);
  if (!page) {
    return NextResponse.json(
      { success: false, message: 'Page not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, page });
}

export async function PUT(request: Request, { params }: RouteParams) {
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

  const { id } = await params;
  const pages = await loadPages(siteId);
  const index = pages.findIndex((p) => p.id === id);
  if (index === -1) {
    return NextResponse.json(
      { success: false, message: 'Page not found' },
      { status: 404 }
    );
  }

  try {
    const body = (await request.json()) as Partial<SitePage>;
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const path = typeof body.path === 'string' ? body.path.trim() : '';
    const content = typeof body.content === 'string' ? body.content : '';

    if (!label) {
      return NextResponse.json(
        { success: false, message: 'Menu label is required' },
        { status: 400 }
      );
    }
    if (!path) {
      return NextResponse.json(
        { success: false, message: 'Path is required' },
        { status: 400 }
      );
    }

    const updated: SitePage = {
      ...pages[index],
      label,
      path: path.startsWith('/') ? path : `/${path}`,
      content,
    };

    const next = [...pages];
    next[index] = updated;
    await savePages(siteId, next);

    return NextResponse.json({ success: true, page: updated });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to save page' },
      { status: 500 }
    );
  }
}
