import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import {
  deletePost,
  getPostById,
  updatePost,
} from '@/lib/db/queries';
import { postSchema, type Post } from '@/lib/admin/posts';
import {
  requireSiteOwnership,
  guardError,
} from '@/lib/security';

export const runtime = 'edge';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Resolves the post and enforces tenant isolation: the authenticated session
 * MUST own the site the post belongs to. Cross-tenant access is rejected with
 * 403. This is a THIN WRAPPER over the security boundary — no business logic.
 */
async function authorizePost(
  request: NextRequest,
  id: string,
): Promise<{ ok: true; db: ReturnType<typeof getDb> } | { ok: false; response: NextResponse }> {
  const db = getDb();
  const post = await getPostById(db, id);
  if (!post) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: 'Not found' },
        { status: 404 },
      ),
    };
  }
  const guard = await requireSiteOwnership(request, db, post.siteId);
  if (!guard.ok) {
    return { ok: false, response: guardError(guard) };
  }
  return { ok: true, db };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await authorizePost(request, id);
  if (!auth.ok) return auth.response;

  const db = auth.db;
  const post = await getPostById(db, id);
  return NextResponse.json({ success: true, post });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await authorizePost(request, id);
  if (!auth.ok) return auth.response;

  const db = auth.db;
  const existing = await getPostById(db, id);
  if (!existing) {
    return NextResponse.json(
      { success: false, message: 'Not found' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const result = postSchema.safeParse(body);
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
    const now = new Date().toISOString();
    // Milestone H — Phase H.1: Scheduled Publishing. When a future scheduledAt
    // is provided, hold the post in `scheduled` state. Otherwise honor the
    // requested status and stamp publishedAt once on publish.
    const isScheduled =
      data.status === 'scheduled' &&
      !!data.scheduledAt &&
      new Date(data.scheduledAt).getTime() > new Date(now).getTime();

    const updatedPost: Partial<Post> = {
      title: data.title,
      slug: data.slug,
      category: data.category,
      tags: data.tags
        ? data.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
            .join(',')
        : '',
      audioUrl: data.audioUrl || undefined,
      featuredImageUrl: data.featuredImageUrl || undefined,
      content: data.content,
      status: isScheduled ? 'scheduled' : data.status,
      scheduledAt: data.scheduledAt || undefined,
      publishedAt:
        !isScheduled && data.status === 'published'
          ? existing.publishedAt ?? now
          : existing.publishedAt,
      updatedAt: now,
    };


    const post = await updatePost(db, id, updatedPost);
    return NextResponse.json({ success: true, post });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await authorizePost(request, id);
  if (!auth.ok) return auth.response;

  await deletePost(auth.db, id);
  return NextResponse.json({ success: true });
}
