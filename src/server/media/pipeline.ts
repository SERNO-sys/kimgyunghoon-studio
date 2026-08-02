import { getRequestContext } from '@cloudflare/next-on-pages';
import { validateImageSecure } from '@/lib/security/file-upload';

declare global {
  interface R2Bucket {
    put(
      key: string,
      value: ArrayBuffer | string | null,
      options?: { httpMetadata?: { contentType?: string } }
    ): Promise<unknown>;
  }
}

export async function validateImage(file: File): Promise<void> {
  await validateImageSecure(file);
}

/**
 * Returns the image bytes unchanged.
 *
 * Image resizing + WebP conversion is performed on the CLIENT side (see
 * `src/lib/client/image-process.ts`) because the Cloudflare Edge runtime does
 * not provide browser DOM APIs such as `createImageBitmap`, `OffscreenCanvas`
 * or `canvas.getImageData()`. Attempting to use them here throws
 * `createImageBitmap is not defined`. The server therefore only stores the
 * already-processed bytes to R2.
 */
export async function processImage(
  buffer: ArrayBuffer,
  mimeType: string
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  return { buffer, contentType: mimeType };
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