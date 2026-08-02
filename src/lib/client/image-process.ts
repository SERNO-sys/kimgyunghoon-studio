'use client';

/**
 * Client-side image preprocessing.
 *
 * The server upload handler runs in the Cloudflare Edge runtime, where browser
 * DOM APIs such as `createImageBitmap`, `OffscreenCanvas` and
 * `canvas.getImageData()` are NOT available. Attempting to use them server-side
 * throws `createImageBitmap is not defined`.
 *
 * To keep the Edge handler simple and reliable, image resizing + WebP
 * conversion is performed here in the browser (where these APIs are fully
 * supported) before the bytes are sent to the server. The server then only
 * stores the already-processed WebP bytes to R2.
 */

const MAX_DIMENSION = 2048; // 최대 가로/세로 크기 (px)
const WEBP_QUALITY = 0.8; // WebP 품질 (0-1)

/**
 * Resizes an image to at most MAX_DIMENSION px on its longest side and converts
 * it to WebP. GIFs are returned unchanged to preserve animation.
 *
 * @param file the source image file
 * @returns a new File containing the processed WebP (or the original GIF)
 */
export async function preprocessImage(file: File): Promise<File> {
  // GIF는 애니메이션 보존을 위해 변환하지 않음
  if (file.type === 'image/gif') {
    return file;
  }

  const bitmap = await createImageBitmap(file);

  // 비율 유지 리사이즈
  let { width, height } = bitmap;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  if (scale < 1) {
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Unable to create canvas context for image processing');
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY);
  });
  if (!blob) {
    throw new Error('WebP encoding failed');
  }

  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
}
