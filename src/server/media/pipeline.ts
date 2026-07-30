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

export async function resizeImage(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  // TODO: implement image resize using sharp, Cloudflare Images, or a WASM library.
  return buffer;
}

export async function compressImage(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  // TODO: implement image compression.
  return buffer;
}

export async function convertToWebP(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  // TODO: implement WebP conversion.
  return buffer;
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
