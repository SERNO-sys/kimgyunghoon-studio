import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import { countMediaBySite, createMedia, listSitesByOwner } from '@/lib/db/queries';
import { ACCEPTED_IMAGE_TYPES } from '@/lib/admin/media';
import { getCurrentUserTier, TIER_LIMITS } from '@/lib/config/tiers';
import type { Media } from '@/lib/db/types';
import {
  validateImage,
  resizeImage,
  compressImage,
  convertToWebP,
  uploadToR2,
} from '@/server/media/pipeline';

export const runtime = 'edge';

async function getCurrentSiteId(userId: string): Promise<string | null> {
  const db = getDb();
  const sites = await listSitesByOwner(db, userId);
  return sites[0]?.id ?? null;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.\-]/g, '-');
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

  const db = getDb();
  const userTier = getCurrentUserTier();
  const tierLimits = TIER_LIMITS[userTier];
  const maxFileSizeBytes = tierLimits.MAX_MEDIA_SIZE_MB * 1024 * 1024;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: '지원하지 않는 파일 형식입니다. 이미지(jpeg, png, webp, gif)만 업로드할 수 있습니다.' },
        { status: 400 }
      );
    }

    if (file.size > maxFileSizeBytes) {
      return NextResponse.json(
        { success: false, message: `파일 크기는 ${tierLimits.MAX_MEDIA_SIZE_MB}MB를 초과할 수 없습니다.` },
        { status: 400 }
      );
    }

    const existingCount = await countMediaBySite(db, siteId);
    if (existingCount >= tierLimits.MAX_MEDIA_COUNT) {
      return NextResponse.json(
        { success: false, message: `현재 플랜에서는 최대 ${tierLimits.MAX_MEDIA_COUNT}개의 미디어만 업로드할 수 있습니다.` },
        { status: 400 }
      );
    }

    await validateImage(file);

    let buffer = await file.arrayBuffer();
    buffer = await resizeImage(buffer);
    buffer = await compressImage(buffer);
    buffer = await convertToWebP(buffer);

    const url = await uploadToR2(buffer, file.name, file.type);

    const mediaItem: Media = {
      id: crypto.randomUUID(),
      siteId,
      name: file.name,
      size: file.size,
      type: file.type,
      url,
      createdAt: new Date().toISOString(),
    };

    await createMedia(db, mediaItem);
    return NextResponse.json({ success: true, media: mediaItem });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
