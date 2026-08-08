import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import {
  deletePost,
  getPostById,
  updatePost,
} from '@/lib/db/queries';
import { postSchema, type Post } from '@/lib/admin/posts';

export const runtime = 'edge';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const db = getDb();
  const post = await getPostById(db, id);
  if (!post) {
    return NextResponse.json(
      { success: false, message: 'Not found' },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, post });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const db = getDb();
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

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const db = getDb();
  const existing = await getPostById(db, id);
  if (!existing) {
    return NextResponse.json(
      { success: false, message: 'Not found' },
      { status: 404 }
    );
  }

  await deletePost(db, id);
  return NextResponse.json({ success: true });
}
