import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import {
  deleteSite,
  getSiteById,
  listCategoriesBySite,
  listDeployVersionsBySite,
  listDomainsBySite,
  listMediaBySite,
  listPostsBySite,
  updateSite,
} from '@/lib/db/queries';

export const runtime = 'edge';

/**
 * Phase 20.4: Project Settings.
 * Updates the project's editable metadata (name, description). Only the site
 * owner may update. The payload is validated server-side and only the two
 * allowed fields are ever written — the client can never mutate ThemeConfig or
 * any other protected field through this route.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { siteId } = await params;
  const db = getDb();
  const site = await getSiteById(db, siteId);

  if (!site) {
    return NextResponse.json(
      { success: false, message: 'Site not found' },
      { status: 404 }
    );
  }

  // Only the site owner may update this site.
  if (site.ownerId !== session.userId) {
    return NextResponse.json(
      { success: false, message: 'Forbidden' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { name, description } = (body ?? {}) as {
    name?: unknown;
    description?: unknown;
  };

  // Whitelist the editable fields. Only name/description are accepted; any
  // other field (e.g. themeConfig, ownerId) is silently ignored so the client
  // can never escalate privileges or mutate protected state.
  const patch: { name?: string; description?: string } = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: '사이트 이름을 입력해주세요.' },
        { status: 400 }
      );
    }
    patch.name = name.trim().slice(0, 120);
  }

  if (description !== undefined) {
    if (typeof description !== 'string') {
      return NextResponse.json(
        { success: false, message: '설명 형식이 올바르지 않습니다.' },
        { status: 400 }
      );
    }
    patch.description = description.trim().slice(0, 500);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { success: false, message: '변경할 내용이 없습니다.' },
      { status: 400 }
    );
  }

  try {
    const updated = await updateSite(db, siteId, patch);
    if (!updated) {
      return NextResponse.json(
        { success: false, message: '사이트 정보를 저장하지 못했습니다.' },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      message: '프로젝트 정보가 저장되었습니다.',
      site: { id: updated.id, name: updated.name, description: updated.description },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update site';
    console.error('[UpdateSite] error:', error);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

/**
 * Deletes a site and ALL of its related records (domains, posts, media,
 * categories, settings, deploy versions) so the user can start fresh from a
 * clean slate. Only the site owner (or an admin) may delete a site.
 */
export async function DELETE(

  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { siteId } = await params;
  const db = getDb();
  const site = await getSiteById(db, siteId);

  if (!site) {
    return NextResponse.json(
      { success: false, message: 'Site not found' },
      { status: 404 }
    );
  }

  // Only the site owner may delete this site.
  if (site.ownerId !== session.userId) {
    return NextResponse.json(
      { success: false, message: 'Forbidden' },
      { status: 403 }
    );
  }

  try {
    // Delete all related records first (foreign-key-safe order).
    const domains = await listDomainsBySite(db, siteId);
    for (const d of domains) await db.domains.delete(d.id);

    const posts = await listPostsBySite(db, siteId);
    for (const p of posts) await db.posts.delete(p.id);

    const media = await listMediaBySite(db, siteId);
    for (const m of media) await db.media.delete(m.id);

    const categories = await listCategoriesBySite(db, siteId);
    for (const c of categories) await db.categories.delete(c.id);

    const deployVersions = await listDeployVersionsBySite(db, siteId);
    for (const v of deployVersions) await db.deployVersions.delete(v.id);

    // Settings row uses the site id as its primary key.
    await db.settings.delete(siteId);

    // Finally delete the site itself.
    const deleted = await deleteSite(db, siteId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Failed to delete site' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '사이트가 삭제되었습니다.',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete site';
    console.error('[DeleteSite] error:', error);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
