import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import {
  getSettingsBySiteId,
  listPostsBySite,
  listSitesByOwner,
  updateSite,
} from '@/lib/db/queries';
import { createDeploymentSnapshot } from '@/lib/deployment';

export const runtime = 'edge';

async function getCurrentSiteId(userId: string): Promise<string | null> {
  const db = getDb();
  const sites = await listSitesByOwner(db, userId);
  return sites[0]?.id ?? null;
}

export async function POST() {
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
    const db = getDb();
    const now = new Date().toISOString();

    // Create a deployment snapshot first so we can persist its version.
    const deployment = await createDeploymentSnapshot(db, siteId, 'manual');

    // Mark the site as published and record the latest deploy version.
    await updateSite(db, siteId, {
      updatedAt: now,
      isPublished: true,
      deployVersion: deployment.version,
    });

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
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publish failed';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

