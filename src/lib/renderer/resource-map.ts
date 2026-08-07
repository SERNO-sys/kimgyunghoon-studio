/**
 * AWIE V2 - ResourceMap Builder.
 *
 * CRITICAL PERFORMANCE RULE: The renderer MUST NOT use Array.find() to look up
 * resources during render. Instead, the engine builds an indexed ResourceMap
 * once from the ThemeConfig, then all lookups (Pages -> Sections -> Assets)
 * use the Map for O(1) access.
 *
 * The builder is a pure function: it reads the ThemeConfig and produces a
 * read-only ResourceMap. It never mutates the config.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic.
 */

import type { ThemeConfig } from '../theme-config/v2';
import type { ResourceMap } from './types';

/**
 * Builds an indexed ResourceMap from a ThemeConfig.
 *
 * The ThemeConfig is treated as immutable input. The returned maps are
 * read-only views over the config's collections.
 */
export function buildResourceMap(config: ThemeConfig): ResourceMap {
  const pages = new Map<string, ThemeConfig['resources']['pages'][number]>();
  for (const page of config.resources.pages) {
    pages.set(page.id, page);
  }

  const sections = new Map<string, ThemeConfig['resources']['sections'][number]>();
  for (const section of config.resources.sections) {
    sections.set(section.id, section);
  }

  const assets = new Map<string, ThemeConfig['resources']['assets'][number]>();
  for (const asset of config.resources.assets) {
    assets.set(asset.id, asset);
  }

  return {
    pages,
    sections,
    assets,
  };
}
