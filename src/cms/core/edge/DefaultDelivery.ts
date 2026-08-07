/**
 * AWIE V2 - Phase 15.2: Edge Delivery - Default Implementations.
 *
 * This module provides the concrete implementations of the Edge Delivery
 * boundary:
 *
 *   1. JsonDeliverySerializer - a JSON implementation of IDeliverySerializer.
 *   2. DefaultEdgeDeliveryAdapter - a transport-independent implementation of
 *      IEdgeDeliveryAdapter.
 *
 * ============================================================================
 * CRITICAL ARCHITECTURE RULES (ADR-007 / ADR-008 / Level-A Revision)
 * ============================================================================
 * 1. Serialization is a Policy, NOT a Transport. The JsonDeliverySerializer
 *    owns the ONLY JSON.stringify call in the Edge Delivery layer. The Edge
 *    Adapter NEVER serializes.
 *
 * 2. Transport Independence. The DefaultEdgeDeliveryAdapter consumes ONLY a
 *    DeliveryArtifact + CompositionIdentity. It is completely blind to the
 *    encoding format (JSON, MessagePack, Binary).
 *
 * 3. Runtime Purity (ADR-008). The Edge Adapter NEVER resolves, edits,
 *    composes, validates, or decides. It only generates optimal delivery
 *    responses (ETag, Cache-Control, Payload).
 * ============================================================================
 */

import type {
  DeliveryArtifact,
  DeliveryResponse,
  IDeliverySerializer,
  IEdgeDeliveryAdapter,
} from './types';
import type { ThemeConfig } from '../../../lib/theme-config/v2/types';
import type { CompositionIdentity } from '../resolvers/types';

// ---------------------------------------------------------------------------
// JsonDeliverySerializer (SERIALIZATION IS A POLICY)
// ---------------------------------------------------------------------------

/**
 * A JSON implementation of the IDeliverySerializer policy.
 *
 * SERIALIZATION IS A POLICY, NOT A TRANSPORT: This class owns the ONLY
 * JSON.stringify call in the Edge Delivery layer. It converts a ThemeConfig
 * execution contract into a JSON DeliveryArtifact.
 *
 * STRICT RULES:
 * - Converts ThemeConfig -> DeliveryArtifact.
 * - Performs NO transport concerns (ETag, Cache-Control, headers).
 * - Is swappable with a MessagePack or Binary serializer without touching the
 *   Edge Adapter.
 */
export class JsonDeliverySerializer implements IDeliverySerializer {
  /**
   * Serializes a ThemeConfig into a JSON DeliveryArtifact.
   *
   * @param config - The immutable execution contract to serialize.
   * @returns A Promise resolving to the JSON DeliveryArtifact.
   */
  async serialize(config: ThemeConfig): Promise<DeliveryArtifact> {
    const payload = JSON.stringify(config);
    return {
      payload,
      contentType: 'application/json',
      byteLength: Buffer.byteLength(payload, 'utf8'),
    };
  }
}

// ---------------------------------------------------------------------------
// DefaultEdgeDeliveryAdapter (TRANSPORT INDEPENDENCE)
// ---------------------------------------------------------------------------

/**
 * The default transport-independent Edge Delivery Adapter.
 *
 * TRANSPORT INDEPENDENCE: This adapter strictly takes the DeliveryArtifact and
 * the CompositionIdentity, generating optimal delivery responses (ETag,
 * Cache-Control, Payload) completely blind to the encoding format.
 *
 * STRICT RULES:
 * - Consumes a DeliveryArtifact, NEVER a ThemeConfig.
 * - MUST NOT perform serialization (no JSON.stringify).
 * - MUST NOT resolve, edit, compose, validate, or decide (ADR-008).
 * - Generates deterministic ETags and Cache-Control directives.
 */
export class DefaultEdgeDeliveryAdapter implements IEdgeDeliveryAdapter {
  /**
   * Generates an optimal delivery response for a given artifact.
   *
   * The ETag is derived deterministically from the CompositionIdentity and the
   * artifact's byte length. It is a strong ETag (quoted) suitable for cache
   * validation. The Cache-Control directive is a public, immutable directive
   * appropriate for edge-cached execution contracts.
   *
   * @param identity - The immutable composition identity (for ETag derivation).
   * @param artifact - The serialized DeliveryArtifact to deliver.
   * @returns A Promise resolving to the optimal DeliveryResponse.
   */
  async deliver(
    identity: CompositionIdentity,
    artifact: DeliveryArtifact,
  ): Promise<DeliveryResponse> {
    const etag = this.computeEtag(identity, artifact);
    return {
      payload: artifact.payload,
      contentType: artifact.contentType,
      byteLength: artifact.byteLength,
      etag,
      cacheControl: 'public, max-age=3600, immutable',
    };
  }

  /**
   * Computes a deterministic strong ETag from the identity and artifact.
   *
   * This is a pure, deterministic function. It does NOT resolve, edit, compose,
   * validate, or decide. It simply derives a stable cache key from the inputs.
   *
   * @param identity - The immutable composition identity.
   * @param artifact - The serialized DeliveryArtifact.
   * @returns A quoted strong ETag string.
   */
  private computeEtag(identity: CompositionIdentity, artifact: DeliveryArtifact): string {
    // A deterministic hash of the identity + byte length. This is a stable,
    // content-derived fingerprint. It is NOT a cryptographic guarantee; it is a
    // cache-validation token.
    const seed = `${identity}:${artifact.byteLength}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0; // Convert to a 32-bit integer.
    }
    // Normalize to an unsigned hex string for a clean, quoted ETag.
    const hex = (hash >>> 0).toString(16).padStart(8, '0');
    return `"${hex}"`;
  }
}
