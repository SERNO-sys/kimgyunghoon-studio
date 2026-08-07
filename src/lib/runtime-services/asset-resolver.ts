/**
 * AWIE V2 - Phase 11: Asset Resolver Service.
 *
 * The Asset Resolver is a PLATFORM SERVICE that resolves an asset id to a
 * usable, fully-qualified URL. It is the concrete implementation of the
 * `AssetResolver` interface defined in the Renderer Foundation. The Renderer
 * consumes this service through its RenderContext.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * The Asset Resolver is the EXECUTION layer. It:
 *   1. RESOLVES - turns an asset id into a usable URL.
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - It NEVER imports BusinessBrief, IndustryProfile,
 *      or RecipeBlueprint. It operates ONLY on asset data.
 *   2. ZERO RENDERING - It NEVER renders UI. It only resolves ids to URLs.
 *   3. DETERMINISM - Same asset id -> same URL. No randomness, no side effects.
 *   4. O(1) LOOKUP - Uses a Map for O(1) resolution. No Array.find().
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { AssetConfig } from '../theme-config/v2';
import { BaseService } from './core';
import type { RuntimeEventBus } from './core';
import type { AssetResolverService, ResolvedAsset } from './types';

/**
 * The default Asset Resolver service.
 *
 * Resolves an asset id to a usable URL by looking it up in a Map of asset
 * configs. The asset configs are derived from the ThemeConfig's flat `assets`
 * array (the SSOT). The resolver NEVER reads raw storage keys directly.
 *
 * The resolver is deterministic: given the same asset id, it always returns
 * the same resolved asset.
 *
 * It implements the UNIVERSAL RuntimeService contract (lifecycle + health) and
 * emits "asset:resolved" events on the RuntimeEventBus for observability.
 */
export class DefaultAssetResolver
  extends BaseService
  implements AssetResolverService
{
  /** The stable service id. */
  readonly id = 'asset-resolver' as const;

  /** The O(1) asset lookup map. */
  private readonly assets: ReadonlyMap<string, AssetConfig>;

  /**
   * Constructs a DefaultAssetResolver.
   *
   * @param assets The flat asset configs from the ThemeConfig.
   * @param bus The optional RuntimeEventBus for observability.
   */
  constructor(assets: readonly AssetConfig[], bus?: RuntimeEventBus) {
    super(bus);
    const map = new Map<string, AssetConfig>();
    for (const asset of assets) {
      map.set(asset.id, asset);
    }
    this.assets = map;
  }

  /**
   * Resolves an asset id to a usable URL.
   *
   * @param assetId The asset id to resolve.
   * @returns The resolved asset, or undefined if the asset is unknown.
   */
  resolve(assetId: string): ResolvedAsset | undefined {
    const asset = this.assets.get(assetId);
    if (!asset) {
      return undefined;
    }
    const resolved: ResolvedAsset = {
      url: asset.url,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      alt: asset.alt,
    };
    this.emit('asset:resolved', { assetId, url: resolved.url });
    return resolved;
  }
}


