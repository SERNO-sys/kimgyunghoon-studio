import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import {
  deleteMedia,
  getMediaById,
  listMediaBySite,
  listSitesByOwner,
} from '@/lib/db/queries';

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
  const media = await listMediaBySite(db, siteId);
  return NextResponse.json({ success: true, media });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json(
      { success: false, message: 'ID is required' },
      { status: 400 }
    );
  }

  const db = getDb();
  const existing = await getMediaById(db, id);
  if (!existing) {
    return NextResponse.json(
      { success: false, message: 'Not found' },
      { status: 404 }
    );
  }

  await deleteMedia(db, id);
  return NextResponse.json({ success: true });
}
