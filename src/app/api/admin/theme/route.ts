import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import { listSitesByOwner, updateSite } from '@/lib/db/queries';
import { themeSchema } from '@/lib/admin/theme';

export const runtime = 'edge';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const db = getDb();
  const sites = await listSitesByOwner(db, session.userId);
  if (sites.length === 0) {
    return NextResponse.json(
      { success: false, message: 'No site found' },
      { status: 404 }
    );
  }

  const site = sites[0];
  return NextResponse.json({
    success: true,
    theme: { id: site.theme || 'default' },
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

  try {
    const body = await request.json();
    const result = themeSchema.safeParse(body);
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

    const db = getDb();
    const sites = await listSitesByOwner(db, session.userId);
    if (sites.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No site found' },
        { status: 404 }
      );
    }

    await updateSite(db, sites[0].id, { theme: result.data.id });
    return NextResponse.json({ success: true, message: 'Theme saved' });
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

  const db = getDb();
  const sites = await listSitesByOwner(db, session.userId);
  if (sites.length === 0) {
    return NextResponse.json(
      { success: false, message: 'No site found' },
      { status: 404 }
    );
  }

  await updateSite(db, sites[0].id, { theme: 'default' });
  return NextResponse.json({ success: true, message: 'Theme reset' });
}
