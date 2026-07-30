import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { settingsSchema } from '@/lib/admin/settings';
import { getDb } from '@/lib/db/client';
import {
  getSettingsBySiteId,
  listSitesByOwner,
  upsertSettings,
} from '@/lib/db/queries';
import type { SiteSettings } from '@/lib/db/types';

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
  if (!settings) {
    return NextResponse.json({ success: true, settings: null });
  }

  const social = JSON.parse(settings.social) as Record<string, unknown>;

  return NextResponse.json({
    success: true,
    settings: {
      general: JSON.parse(settings.general),
      contact: JSON.parse(settings.contact),
      analytics: JSON.parse(settings.analytics),
      social: {
        youtube: social.youtube ?? '',
        instagram: social.instagram ?? '',
        twitter: social.twitter ?? '',
        tiktok: social.tiktok ?? '',
        facebook: social.facebook ?? '',
        soundcloud: social.soundcloud ?? '',
        spotify: social.spotify ?? '',
        threads: social.threads ?? '',
      },
    },
  });
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
    const body = await request.json();
    const result = settingsSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid input',
          errors: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = result.data;
    const db = getDb();
    const existing = await getSettingsBySiteId(db, siteId);
    await upsertSettings(db, {
      id: siteId,
      siteId,
      general: JSON.stringify(data.general),
      contact: JSON.stringify(data.contact),
      analytics: JSON.stringify(data.analytics),
      social: JSON.stringify(data.social),
      pages: existing?.pages ?? '[]',
      updatedAt: new Date().toISOString(),
    } as SiteSettings);

    return NextResponse.json({ success: true, message: 'Settings saved' });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
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
  const existing = await getSettingsBySiteId(db, siteId);
  await upsertSettings(db, {
    id: siteId,
    siteId,
    general: '{}',
    contact: '{}',
    analytics: '{}',
    social: '{}',
    pages: existing?.pages ?? '[]',
    updatedAt: new Date().toISOString(),
  } as SiteSettings);

  return NextResponse.json({ success: true, message: 'Settings reset' });
}
