import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { mockMedia } from '@/lib/admin/media-store';
import type { MediaItem } from '@/lib/admin/media';
import {
  validateImage,
  resizeImage,
  compressImage,
  convertToWebP,
  uploadToR2,
} from '@/server/media/pipeline';

export const runtime = 'edge';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    await validateImage(file);

    let buffer = await file.arrayBuffer();
    buffer = await resizeImage(buffer);
    buffer = await compressImage(buffer);
    buffer = await convertToWebP(buffer);

    const url = await uploadToR2(buffer, file.name);

    const mediaItem: MediaItem = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      url,
      createdAt: new Date().toISOString(),
    };

    mockMedia.push(mediaItem);
    return NextResponse.json({ success: true, media: mediaItem });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
