/**
 * AWIE V2 - Phase 15.2: Edge Delivery - Boundary Types.
 *
 * This module defines the STRICT boundary interfaces for the Edge Delivery
 * layer. It is INTERFACE ONLY. It contains NO concrete classes.
 *
 * ============================================================================
 * CRITICAL ARCHITECTURE RULES (ADR-007 / ADR-008 / Level-A Revision)
 * ============================================================================
 * 1. Consume DeliveryArtifact, NOT ThemeConfig. The Edge Delivery layer MUST
 *    NOT consume the ThemeConfig execution contract directly. It consumes a
 *    DeliveryArtifact (a serialized buffer/string with metadata).
 *
 * 2. Serialization is a Policy, NOT a Transport. The Edge Adapter MUST NOT
 *    perform serialization (e.g. JSON.stringify). An IDeliverySerializer
 *    handles the conversion: ThemeConfig -> ISerializer -> DeliveryArtifact.
 *
 * 3. Transport Independence. The Edge Adapter strictly takes the
 *    DeliveryArtifact and the CompositionIdentity, generating optimal delivery
 *    responses (ETag, Cache-Control, Payload) completely blind to the encoding
 *    format (JSON, MessagePack, Binary).
 *
 * 4. Interface Only. IDeliverySerializer and IEdgeDeliveryAdapter are pure
 *    interfaces. Concrete implementations are defined separately and are NOT
 *    part of this module.
 * ============================================================================
 */

import type { ThemeConfig } from '../../../lib/theme-config/v2/types';
import type { CompositionIdentity } from '../resolvers/types';

// ---------------------------------------------------------------------------
// DeliveryArtifact (THE ARTIFACT)
// ---------------------------------------------------------------------------

/**
 * The serialized artifact that crosses the Serialization Boundary.
 *
 * THE ARTIFACT: This is the ONLY thing the Edge Delivery layer consumes. It is
 * a serialized buffer/string with metadata. The Edge Adapter is completely
 * blind to the encoding format (JSON, MessagePack, Binary).
 *
 * STRICT RULES:
 * - Carries the serialized payload (string or Uint8Array).
 * - Carries the content type (e.g. "application/json", "application/msgpack").
 * - Carries the byte length for accurate Content-Length headers.
 * - Carries NO ThemeConfig and NO CMS model. It is a pure transport artifact.
 */
export interface DeliveryArtifact {
  /** The serialized payload (string for text encodings, Uint8Array for binary). */
  readonly payload: string | Uint8Array;
  /** The MIME content type of the payload (e.g. "application/json"). */
  readonly contentType: string;
  /** The byte length of the payload (for accurate Content-Length headers). */
  readonly byteLength: number;
}

// ---------------------------------------------------------------------------
// IDeliverySerializer (SERIALIZATION IS A POLICY)
// ---------------------------------------------------------------------------

/**
 * The Serialization Policy boundary.
 *
 * SERIALIZATION IS A POLICY, NOT A TRANSPORT: This interface owns the single
 * responsibility of converting a ThemeConfig execution contract into a
 * DeliveryArtifact. The Edge Adapter MUST NOT perform serialization itself.
 *
 * STRICT RULES:
 * - Converts ThemeConfig -> DeliveryArtifact.
 * - Is encoding-agnostic: JSON, MessagePack, and Binary are all valid
 *   implementations of this interface.
 * - MUST NOT perform transport concerns (ETag, Cache-Control, headers).
 */
export interface IDeliverySerializer {
  /**
   * Serializes a ThemeConfig execution contract into a DeliveryArtifact.
   *
   * @param config - The immutable execution contract to serialize.
   * @returns A Promise resolving to the serialized DeliveryArtifact.
   */
  serialize(config: ThemeConfig): Promise<DeliveryArtifact>;
}

// ---------------------------------------------------------------------------
// IEdgeDeliveryAdapter (TRANSPORT INDEPENDENCE)
// ---------------------------------------------------------------------------

/**
 * The optimal delivery response produced by the Edge Adapter.
 *
 * This is a pure transport response. It carries the payload, the content type,
 * the ETag, and the Cache-Control directive. It is completely blind to the
 * encoding format of the payload.
 */
export interface DeliveryResponse {
  /** The serialized payload to deliver. */
  readonly payload: string | Uint8Array;
  /** The MIME content type of the payload. */
  readonly contentType: string;
  /** The byte length of the payload. */
  readonly byteLength: number;
  /** The strong ETag for cache validation (derived from the artifact). */
  readonly etag: string;
  /** The Cache-Control directive (e.g. "public, max-age=3600"). */
  readonly cacheControl: string;
}

/**
 * The Edge Delivery Adapter boundary.
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
export interface IEdgeDeliveryAdapter {
  /**
   * Generates an optimal delivery response for a given artifact.
   *
   * @param identity - The immutable composition identity (for ETag derivation).
   * @param artifact - The serialized DeliveryArtifact to deliver.
   * @returns A Promise resolving to the optimal DeliveryResponse.
   */
  deliver(identity: CompositionIdentity, artifact: DeliveryArtifact): Promise<DeliveryResponse>;
}
