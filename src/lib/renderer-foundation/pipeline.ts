/**
 * AWIE V2 - Renderer Foundation Pipeline (Phase 08, Milestone 2B).
 *
 * The concrete Validator and ResourceBuilder. These are the dedicated external
 * layers that prepare a ThemeConfig for the DUMB ThemeEngine:
 *
 *   1. DefaultThemeValidator      - validates referential integrity.
 *   2. DefaultThemeResourceBuilder - converts flat ThemeConfig arrays into the
 *                                    O(1) ResourceMap.
 *
 * The ThemeEngine NEVER knows the internal array structure of ThemeConfig. It
 * consumes the ResourceMap produced here.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { ThemeConfig } from '../theme-config/v2';
import type { ResourceMap, ThemeResourceBuilder, ThemeValidator } from './types';

/**
 * Thrown when a ThemeConfig fails validation.
 *
 * Carries a list of human-readable problems so the caller can diagnose exactly
 * what is broken.
 */
export class ThemeValidationError extends Error {
  /** The list of validation problems. */
  readonly problems: string[];

  constructor(problems: string[]) {
    super(
      `ThemeConfig validation failed with ${problems.length} problem(s):\n` +
        problems.map((p) => `  - ${p}`).join('\n'),
    );
    this.name = 'ThemeValidationError';
    this.problems = problems;
  }
}

/**
 * The default ThemeValidator.
 *
 * Checks referential integrity of a ThemeConfig:
 *   - Every page.sectionIds entry must exist in config.resources.sections.
 *   - Every section.assetIds entry must exist in config.resources.assets.
 *   - Every section.formId must exist in config.resources.forms.
 *
 * Fails fast by throwing a ThemeValidationError listing all problems.
 */
export class DefaultThemeValidator implements ThemeValidator {
  /**
   * Validates a ThemeConfig. Throws if the config is invalid.
   *
   * @param config The ThemeConfig to validate.
   * @throws {ThemeValidationError} If the config is invalid.
   */
  validate(config: ThemeConfig): void {
    const problems: string[] = [];

    const sectionIds = new Set(config.resources.sections.map((s) => s.id));
    const assetIds = new Set(config.resources.assets.map((a) => a.id));
    const formIds = new Set(config.resources.forms.map((f) => f.id));

    // Referential integrity: pages -> sections.
    for (const page of config.resources.pages) {
      for (const sectionId of page.sectionIds) {
        if (!sectionIds.has(sectionId)) {
          problems.push(
            `Page "${page.id}" references missing section "${sectionId}".`,
          );
        }
      }
    }

    // Referential integrity: sections -> assets.
    for (const section of config.resources.sections) {
      for (const assetId of section.assetIds ?? []) {
        if (!assetIds.has(assetId)) {
          problems.push(
            `Section "${section.id}" references missing asset "${assetId}".`,
          );
        }
      }
      if (section.formId !== undefined && !formIds.has(section.formId)) {
        problems.push(
          `Section "${section.id}" references missing form "${section.formId}".`,
        );
      }
    }

    if (problems.length > 0) {
      throw new ThemeValidationError(problems);
    }
  }
}

/**
 * The default ThemeResourceBuilder.
 *
 * Converts the flat ThemeConfig arrays into the O(1) ResourceMap. This is the
 * ONLY place where the flat arrays are indexed into maps. The ThemeEngine
 * consumes this ResourceMap and never touches the raw arrays.
 */
export class DefaultThemeResourceBuilder implements ThemeResourceBuilder {
  /**
   * Builds the O(1) ResourceMap from a ThemeConfig.
   *
   * @param config The immutable ThemeConfig (the SSOT).
   * @returns The indexed ResourceMap.
   */
  build(config: ThemeConfig): ResourceMap {
    const pages = new Map<string, ThemeConfig['resources']['pages'][number]>();
    for (const page of config.resources.pages) {
      pages.set(page.id, page);
    }

    const sections = new Map<
      string,
      ThemeConfig['resources']['sections'][number]
    >();
    for (const section of config.resources.sections) {
      sections.set(section.id, section);
    }

    const assets = new Map<string, ThemeConfig['resources']['assets'][number]>();
    for (const asset of config.resources.assets) {
      assets.set(asset.id, asset);
    }

    return { pages, sections, assets };
  }
}
