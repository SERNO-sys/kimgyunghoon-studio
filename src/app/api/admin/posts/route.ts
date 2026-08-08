import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import {
  createPost,
  listPostsBySite,
  listSitesByOwner,
  publishDuePosts,
} from '@/lib/db/queries';

import { postSchema, type Post } from '@/lib/admin/posts';
import { slugify } from '@/lib/admin/slug';

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
  // Milestone H — Phase H.1: Scheduled Publishing. Lazily flip any scheduled
  // posts whose due time has passed before returning the list.
  await publishDuePosts(db, siteId);
  const posts = await listPostsBySite(db, siteId);
  return NextResponse.json({ success: true, posts });
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
    // requested status (draft/published) and stamp publishedAt on publish.
    const isScheduled =
      data.status === 'scheduled' &&
      !!data.scheduledAt &&
      new Date(data.scheduledAt).getTime() > new Date(now).getTime();

    const newPost: Post = {
      id: crypto.randomUUID(),
      siteId,
      title: data.title,
      slug: data.slug || slugify(data.title),
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
        !isScheduled && data.status === 'published' ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };


    const db = getDb();
    const post = await createPost(db, newPost);
    return NextResponse.json({ success: true, post });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to process request' },
      { status: 500 }
    );
  }
}
