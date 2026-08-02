import { NextResponse } from 'next/server';
import { getSession, clearSessionOnResponse } from '@/lib/admin/session';

import { accountSchema } from '@/lib/admin/account';
import { getDb } from '@/lib/db/client';
import {
  deleteUser,
  getPrimaryDomain,
  getUserById,
  listSitesByOwner,
} from '@/lib/db/queries';

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
  const user = await getUserById(db, session.userId);
  const ownerSites = await listSitesByOwner(db, session.userId);
  const sites = await Promise.all(
    ownerSites.map(async (site) => {
      const primary = await getPrimaryDomain(db, site.id);
      return {
        id: site.id,
        name: site.name,
        domain: primary?.domain ?? '',
        role: 'Owner',
      };
    })
  );

  return NextResponse.json({
    success: true,
    account: {
      displayName: user?.name ?? session.name,
      newsletter: true,
    },
    sites,
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
    const result = accountSchema.safeParse(body);
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
    const user = await getUserById(db, session.userId);
    if (user) {
      user.name = result.data.displayName;
      user.updatedAt = new Date().toISOString();
    }

    return NextResponse.json({
      success: true,
      message: 'Account settings saved',
    });
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

  try {
    const db = getDb();
    const user = await getUserById(db, session.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const sites = await listSitesByOwner(db, session.userId);
    for (const site of sites) {
      const siteId = site.id;
      for (const domain of await db.domains.findMany({ siteId })) {
        await db.domains.delete(domain.id);
      }
      for (const post of await db.posts.findMany({ siteId })) {
        await db.posts.delete(post.id);
      }
      for (const category of await db.categories.findMany({ siteId })) {
        await db.categories.delete(category.id);
      }
      for (const item of await db.media.findMany({ siteId })) {
        await db.media.delete(item.id);
      }
      for (const version of await db.deployVersions.findMany({ siteId })) {
        await db.deployVersions.delete(version.id);
      }
      await db.settings.delete(siteId);
      await db.sites.delete(siteId);
    }

    await deleteUser(db, session.userId);

    // Clear the session cookie on the response object. In the Edge runtime the
    // `cookies()` API is read-only, so `clearSession()` would be silently
    // ignored and the browser would keep the (now-invalid) session cookie.
    const response = NextResponse.json({
      success: true,
      message: 'Account and all sites deleted successfully',
    });
    clearSessionOnResponse(response);
    return response;

  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
