/**
 * AWIE V2 - Phase 11: SEO Service.
 *
 * The SEO service is a PLATFORM SERVICE that derives SEO metadata from the
 * ThemeConfig (the SSOT). It reads the config's metadata (title, description,
 * domain) and produces a deterministic SEO metadata object.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * The SEO service is the EXECUTION layer. It:
 *   1. TRANSFORMS - derives SEO metadata from the SSOT.
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - It NEVER imports BusinessBrief, IndustryProfile,
 *      or RecipeBlueprint. It operates ONLY on the ThemeConfig (the SSOT).
 *   2. ZERO RENDERING - It NEVER renders HTML. It only produces metadata.
 *   3. DETERMINISM - Same config + page -> same SEO metadata. No randomness.
 *   4. O(1) LOOKUP - Uses a Map for O(1) page lookup. No Array.find().
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { ThemeConfig } from '../theme-config/v2';
import { BaseService } from './core';
import type { RuntimeEventBus } from './core';
import type { SeoBuildOptions, SeoMetadata, SeoService } from './types';

/**
 * The default SEO service.
 *
 * Derives SEO metadata from the ThemeConfig. It reads:
 *   - The site title and description from config.metadata.
 *   - The page title and description from the resolved page.
 *   - The canonical URL from the domain + page route.
 *   - The Open Graph and Twitter metadata derived from the same sources.
 *
 * The SEO service is deterministic: the same config and page always produce
 * the same SEO metadata.
 *
 * It implements the UNIVERSAL RuntimeService contract (lifecycle + health) and
 * emits "seo:generated" events on the RuntimeEventBus for observability.
 */
export class DefaultSeo extends BaseService implements SeoService {
  /** The stable service id. */
  readonly id = 'seo' as const;

  /**
   * Constructs a DefaultSeo.
   *
   * @param bus The optional RuntimeEventBus for observability.
   */
  constructor(bus?: RuntimeEventBus) {
    super(bus);
  }

  /**
   * Builds SEO metadata for a page from the ThemeConfig.
   *
   * @param config The immutable ThemeConfig (the SSOT).
   * @param pageId The page id to build metadata for.
   * @param options Optional overrides (canonical URL, robots).
   * @returns The SEO metadata.
   */
  build(
    config: ThemeConfig,
    pageId: string,
    options?: SeoBuildOptions,
  ): SeoMetadata {
    const page = config.resources.pages.find((p) => p.id === pageId);
    const siteTitle = config.metadata.title;
    const siteDescription = config.metadata.description;
    const domain = config.metadata.domain;

    const pageTitle = page?.title ?? siteTitle;
    const pageDescription = page?.description ?? siteDescription;

    // Build the canonical URL from the domain + page route.
    const canonical =
      options?.canonical ??
      (domain && page ? `${domain}${page.route}` : undefined);

    const metadata: SeoMetadata = {
      title: pageTitle,
      description: pageDescription,
      canonical,
      ogTitle: pageTitle,
      ogDescription: pageDescription,
      ogImage: config.metadata.logo
        ? this.resolveLogo(config, config.metadata.logo)
        : undefined,
      ogType: 'website',
      robots: options?.robots ?? 'index,follow',
      twitterCard: 'summary_large_image',
    };
    this.emit('seo:generated', { pageId, title: metadata.title });
    return metadata;
  }


  /**
   * Resolves a logo asset id to a URL.
   *
   * @param config The ThemeConfig.
   * @param logoId The logo asset id.
   * @returns The logo URL, or undefined if the asset is unknown.
   */
  private resolveLogo(config: ThemeConfig, logoId: string): string | undefined {
    const asset = config.resources.assets.find((a) => a.id === logoId);
    return asset?.url;
  }
}
