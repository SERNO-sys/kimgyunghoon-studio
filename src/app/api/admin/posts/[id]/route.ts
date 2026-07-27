import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { postSchema, type Post } from '@/lib/admin/posts';
import { mockPosts } from '@/lib/admin/posts-store';

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
  const post = mockPosts.find((item) => item.id === id);
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
  const index = mockPosts.findIndex((item) => item.id === id);
  if (index === -1) {
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
    const updatedPost: Post = {
      ...mockPosts[index],
      title: data.title,
      slug: data.slug,
      category: data.category,
      tags: data.tags
        ? data.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      content: data.content,
      status: data.status,
      updatedAt: new Date().toISOString(),
    };

    mockPosts[index] = updatedPost;
    return NextResponse.json({ success: true, post: updatedPost });
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
  const index = mockPosts.findIndex((item) => item.id === id);
  if (index === -1) {
    return NextResponse.json(
      { success: false, message: 'Not found' },
      { status: 404 }
    );
  }

  mockPosts.splice(index, 1);
  return NextResponse.json({ success: true });
}
