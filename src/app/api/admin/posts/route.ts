import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { postSchema, type Post } from '@/lib/admin/posts';
import { mockPosts } from '@/lib/admin/posts-store';
import { slugify } from '@/lib/admin/slug';

export const runtime = 'edge';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }
  return NextResponse.json({ success: true, posts: mockPosts });
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
    const newPost: Post = {
      id: crypto.randomUUID(),
      title: data.title,
      slug: data.slug || slugify(data.title),
      category: data.category,
      tags: data.tags
        ? data.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      content: data.content,
      status: data.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockPosts.push(newPost);
    return NextResponse.json({ success: true, post: newPost });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to process request' },
      { status: 500 }
    );
  }
}
