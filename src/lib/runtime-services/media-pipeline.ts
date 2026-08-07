/**
 * AWIE V2 - Phase 11: Media Pipeline Service.
 *
 * The Media Pipeline service is a PLATFORM SERVICE that processes media assets
 * (image optimization, format conversion, resizing). It produces transformed
 * media URLs.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * The Media Pipeline service is the EXECUTION layer. It:
 *   1. TRANSFORMS - processes media assets deterministically.
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - It NEVER imports BusinessBrief, IndustryProfile,
 *      or RecipeBlueprint. It operates ONLY on media transformation requests.
 *   2. ZERO RENDERING - It NEVER renders UI. It only produces transformed URLs.
 *   3. DETERMINISM - Same request -> same transformed URL. No randomness.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import { BaseService } from './core';
import type { RuntimeEventBus } from './core';
import type {
  MediaPipelineService,
  MediaTransformRequest,
  MediaTransformResult,
} from './types';

/**
 * The default Media Pipeline service.
 *
 * Produces a transformed media URL by appending deterministic query parameters
 * to the source URL. This models an image CDN / optimizer contract (e.g.
 * Cloudflare Images, Imgix). The transformation is deterministic: the same
 * request always produces the same URL.
 *
 * The transformation parameters (width, height, format, quality) are encoded
 * as query parameters. This is a pure, side-effect-free transformation.
 *
 * It implements the UNIVERSAL RuntimeService contract (lifecycle + health) and
 * emits "media:transformed" events on the RuntimeEventBus for observability.
 */
export class DefaultMediaPipeline
  extends BaseService
  implements MediaPipelineService
{
  /** The stable service id. */
  readonly id = 'media-pipeline' as const;

  /**
   * Constructs a DefaultMediaPipeline.
   *
   * @param bus The optional RuntimeEventBus for observability.
   */
  constructor(bus?: RuntimeEventBus) {
    super(bus);
  }

  /**
   * Transforms a media asset according to a request.
   *
   * @param request The transformation request.
   * @returns The transformation result.
   */
  transform(request: MediaTransformRequest): MediaTransformResult {
    const params = new URLSearchParams();

    if (request.width !== undefined) {
      params.set('w', String(request.width));
    }
    if (request.height !== undefined) {
      params.set('h', String(request.height));
    }
    if (request.format !== undefined) {
      params.set('fm', request.format);
    }
    if (request.quality !== undefined) {
      params.set('q', String(request.quality));
    }

    const query = params.toString();
    const url = query.length > 0 ? `${request.source}?${query}` : request.source;

    const result: MediaTransformResult = {
      url,
      width: request.width,
      height: request.height,
      format: request.format,
    };
    this.emit('media:transformed', { source: request.source, url });
    return result;
  }
}


