/**
 * Self-contained WebP encoder for Edge runtime (Cloudflare Pages/Workers).
 *
 * The `@jsquash/webp` library normally loads its `.wasm` file at runtime via
 * `fetch(new URL("webp_enc.wasm", import.meta.url).href)`. In the Cloudflare
 * Pages Edge runtime this runtime fetch of a bundled `.wasm` asset is
 * unreliable. To avoid it entirely we inline the WASM binary as base64 and
 * provide it to the emscripten module factory via the `wasmBinary` option.
 * When `wasmBinary` is set, the emscripten glue returns it directly from
 * `getBinary()` without performing any network request.
 */
import { WEBP_ENC_WASM_BASE64 } from './webp-wasm';

// The emscripten module factory for the non-SIMD WebP encoder. We import it
// directly (bypassing @jsquash/webp's encode.js which does SIMD detection and
// dynamic imports) so we can control exactly which WASM binary is used.
import webpEncModule from '@jsquash/webp/codec/enc/webp_enc.js';


export interface WebPEncodeOptions {
  quality?: number;
}

let modulePromise: Promise<unknown> | null = null;

function decodeBase64(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  // Node.js / Workers fallback
  const buf = Buffer.from(base64, 'base64');
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

function getModule(): Promise<unknown> {
  if (!modulePromise) {
    modulePromise = webpEncModule({
      // Provide the WASM binary directly so no runtime fetch is needed.
      wasmBinary: decodeBase64(WEBP_ENC_WASM_BASE64),
      // Don't automatically invoke any wasm functions.
      noInitialRun: true,
    });
  }
  return modulePromise as Promise<unknown>;
}


/**
 * Encode raw RGBA pixel data into a WebP image.
 *
 * @param data   Uint8ClampedArray of RGBA pixel data (width * height * 4)
 * @param width  image width in pixels
 * @param height image height in pixels
 * @param options encoding options (quality 0-100)
 * @returns      ArrayBuffer containing the encoded WebP bytes
 */
export async function encodeWebP(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: WebPEncodeOptions = {}
): Promise<ArrayBuffer> {
  const webpModule = (await getModule()) as {
    encode: (
      data: Uint8ClampedArray,
      width: number,
      height: number,
      opts: Record<string, unknown>
    ) => { buffer: ArrayBuffer } | null;
  };

  const result = webpModule.encode(data, width, height, {
    quality: options.quality ?? 80,
  });

  if (!result) {
    throw new Error('WebP encoding error.');
  }
  return result.buffer;
}
