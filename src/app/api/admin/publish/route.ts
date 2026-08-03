import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import {
  getSettingsBySiteId,
  getSiteById,
  listPostsBySite,
  listSitesByOwner,
  updateSite,
} from '@/lib/db/queries';
import { createDeploymentSnapshot } from '@/lib/deployment';

export const runtime = 'edge';

/**
 * Resolves the site to publish. Prefers an explicit `siteId` from the request
 * body (so the client can publish the currently selected site even when a user
 * owns multiple sites). Falls back to the user's first site for backward
 * compatibility.
 */
async function resolveSiteId(
  userId: string,
  requestedSiteId?: string
): Promise<string | null> {
  const db = getDb();

  if (requestedSiteId) {
    const site = await getSiteById(db, requestedSiteId);
    if (site && site.ownerId === userId) {
      return site.id;
    }
  }

  const sites = await listSitesByOwner(db, userId);
  return sites[0]?.id ?? null;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  let requestedSiteId: string | undefined;
  try {
    const body = (await request.json()) as { siteId?: unknown };
    requestedSiteId =
      typeof body?.siteId === 'string' && body.siteId ? body.siteId : undefined;
  } catch {
    // No JSON body (e.g. legacy clients) — fall back to the first site.
  }


  const siteId = await resolveSiteId(session.userId, requestedSiteId);
  if (!siteId) {
    return NextResponse.json(
      { success: false, message: 'No site configured' },
      { status: 404 }
    );
  }


  // The tenant subdomain is the first segment of the site UUID (e.g.
  // `f0e36aaa` for `f0e36aaa-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). The middleware
  // resolves `f0e36aaa.lucidworker.com` via a prefix match on the site id, so
  // this is the value that must be bound for the subdomain to resolve.
  const subdomain = siteId.split('-')[0] || siteId;
  console.log('[Publish] siteId:', siteId);
  console.log('[Publish] derived subdomain:', subdomain);
  console.log('[Publish] public URL:', `https://${subdomain}.lucidworker.com`);

  try {
    const db = getDb();
    const now = new Date().toISOString();

    // Create a deployment snapshot first so we can persist its version.
    const deployment = await createDeploymentSnapshot(db, siteId, 'manual');

    // Mark the site as published and record the latest deploy version.
    const updated = await updateSite(db, siteId, {
      updatedAt: now,
      isPublished: true,
      deployVersion: deployment.version,
    });
    console.log('[Publish] updateSite result:', updated);
    console.log('[Publish] isPublished now:', updated?.isPublished);

    // Verify the publish state was actually persisted to D1 by re-reading the
    // site. If it did not stick, surface a clear error instead of silently
    // returning success (which would leave the tenant subdomain 404ing).
    const persisted = await getSiteById(db, siteId);
    if (!persisted) {
      return NextResponse.json(
        { success: false, message: 'Site not found after publish' },
        { status: 500 }
      );
    }
    if (!persisted.isPublished) {
      console.error(
        '[Publish] is_published did not persist for site',
        siteId,
        'persisted value:',
        persisted.isPublished
      );
      return NextResponse.json(
        {
          success: false,
          message:
            '발행 상태가 저장되지 않았습니다. 잠시 후 다시 시도해 주세요.',
        },
        { status: 500 }
      );
    }

    const settings = await getSettingsBySiteId(db, siteId);
    if (settings) {
      await db.settings.update(siteId, {
        ...settings,
        updatedAt: now,
      });

      const posts = await listPostsBySite(db, siteId);
      for (const post of posts) {
        await db.posts.update(post.id, {
          ...post,
          updatedAt: now,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: '1초 만에 홈페이지가 실시간 갱신 배포되었습니다!',
      deployment,
      siteId,
      publicUrl: `https://${subdomain}.lucidworker.com`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publish failed';
    console.error('[Publish] error:', error);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}


