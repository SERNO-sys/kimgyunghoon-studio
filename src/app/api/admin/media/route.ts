import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { mockMedia } from '@/lib/admin/media-store';

export const runtime = 'edge';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }
  return NextResponse.json({ success: true, media: mockMedia });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json(
      { success: false, message: 'ID is required' },
      { status: 400 }
    );
  }

  const index = mockMedia.findIndex((item) => item.id === id);
  if (index === -1) {
    return NextResponse.json(
      { success: false, message: 'Not found' },
      { status: 404 }
    );
  }

  mockMedia.splice(index, 1);
  return NextResponse.json({ success: true });
}
