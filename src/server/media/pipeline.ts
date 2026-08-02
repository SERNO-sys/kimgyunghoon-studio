import { getRequestContext } from '@cloudflare/next-on-pages';
import { validateImageSecure } from '@/lib/security/file-upload';
import { encodeWebP } from './webp-encoder';


declare global {
  interface R2Bucket {
    put(
      key: string,
      value: ArrayBuffer | string | null,
      options?: { httpMetadata?: { contentType?: string } }
    ): Promise<unknown>;
  }
}

const MAX_DIMENSION = 2048; // 최대 가로/세로 크기 (px)
const WEBP_QUALITY = 80; // WebP 품질 (0-100)

export async function validateImage(file: File): Promise<void> {
  await validateImageSecure(file);
}

/**
 * 이미지를 최대 2048px로 리사이즈하고 WebP(품질 80)로 변환한다.
 * Edge 런타임 호환: createImageBitmap + OffscreenCanvas + @jsquash/webp(WASM)
 */
export async function processImage(
  buffer: ArrayBuffer,
  mimeType: string
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  // GIF는 애니메이션 보존을 위해 변환하지 않음
  if (mimeType === 'image/gif') {
    return { buffer, contentType: mimeType };
  }

  const bitmap = await createImageBitmap(new Blob([buffer], { type: mimeType }));

  // 비율 유지 리사이즈
  let { width, height } = bitmap;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  if (scale < 1) {
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Unable to create canvas context for image processing');
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, width, height);
  const webpBuffer = await encodeWebP(imageData.data, width, height, {
    quality: WEBP_QUALITY,
  });



  return { buffer: webpBuffer, contentType: 'image/webp' };
}

export async function resizeImage(
  buffer: ArrayBuffer,
  mimeType = 'image/jpeg'
): Promise<ArrayBuffer> {
  const { buffer: resized } = await processImage(buffer, mimeType);
  return resized;
}

export async function compressImage(
  buffer: ArrayBuffer,
  mimeType = 'image/jpeg'
): Promise<ArrayBuffer> {
  const { buffer: compressed } = await processImage(buffer, mimeType);
  return compressed;
}

export async function convertToWebP(
  buffer: ArrayBuffer,
  mimeType = 'image/jpeg'
): Promise<ArrayBuffer> {
  const { buffer: webp } = await processImage(buffer, mimeType);
  return webp;
}

export async function uploadToR2(
  buffer: ArrayBuffer,
  name: string,
  contentType: string
): Promise<string> {
  const env = getRequestContext().env as {
    MEDIA?: R2Bucket;
    R2_PUBLIC_URL?: string;
  };
  const bucket = env.MEDIA;
  if (!bucket) {
    throw new Error('R2 bucket binding (MEDIA) is not configured.');
  }

  const publicUrl = env.R2_PUBLIC_URL;
  if (!publicUrl) {
    throw new Error('R2_PUBLIC_URL environment variable is not set.');
  }

  const sanitized = name.replace(/[^a-zA-Z0-9_.-]/g, '-');
  const key = `${crypto.randomUUID()}-${sanitized}`;

  await bucket.put(key, buffer, {
    httpMetadata: { contentType },
  });

  const base = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
  return `${base}/${key}`;
}