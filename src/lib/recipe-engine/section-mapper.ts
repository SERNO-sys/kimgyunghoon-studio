/**
 * AWIE V2 - The Section Mapper (SectionMapping layer).
 *
 * This is the ONLY entity allowed to translate semantic Features into actual
 * ThemeConfig UI Sections. The RecipeMerger is completely blind to the UI
 * layout: it only produces a set of resolved Features (and other conceptual
 * strategies). The SectionMapper converts those Features into the final
 * ThemeConfig sections.
 *
 * Pipeline:
 *
 *   Requirement -> Capability -> Feature -> SectionMapping -> ThemeConfig
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure feature-to-section translation.
 */

import type {
  SectionConfig,
  SectionType,
} from '../theme-config/v2/types';
import {
  Feature,
  type FeatureId,
  type RecipeBlueprint,
  type SectionMappingStrategy,
} from './types';

/** A default section type used to satisfy an unmet required feature. */
const DEFAULT_REQUIRED_SECTION_TYPE: Record<string, SectionType> = {
  [Feature.Contact]: 'contact',
  requiresContactForm: 'contact',
  [Feature.Address]: 'text',
  requiresAddress: 'text',
  [Feature.Hours]: 'text',
  requiresOpeningHours: 'text',
  disclaimer: 'text',
  [Feature.Team]: 'features',
};



/** The result of mapping features to sections. */
export interface SectionMappingResult {
  /** The ThemeConfig sections produced from the enabled features. */
  sections: SectionConfig[];
  /** Decision records for auditability. */
  decisions: string[];
  /** Warnings (e.g. a required feature had no mapping and used a default). */
  warnings: string[];
}

/**
 * The SectionMapper.
 *
 * Translates a set of enabled semantic Features into ThemeConfig sections using
 * the recipe's feature->section mappings. It also handles requirement
 * fulfillment: when a required feature has no mapping, it injects a default
 * section and emits a warning.
 */
export class SectionMapper {
  /**
   * Maps enabled features to ThemeConfig sections.
   *
   * @param recipe The recipe providing the feature->section mappings.
   * @param enabledFeatures The set of semantic features to materialize.
   * @param requiredFeatures The set of features that are mandatory.
   * @param unmappedRequirements Required capabilities that had no feature
   *        mapping in the recipe. These are injected as default sections.
   */
  map(
    recipe: RecipeBlueprint,
    enabledFeatures: FeatureId[],
    requiredFeatures: FeatureId[],
    unmappedRequirements: string[] = [],
  ): SectionMappingResult {
    const decisions: string[] = [];
    const warnings: string[] = [];
    const sections: SectionConfig[] = [];

    // 1. Materialize the recipe's static sections.
    for (const section of recipe.content.sections) {
      sections.push({
        id: section.id,
        type: section.type,
        content: { ...section.content },
        assetIds: section.assetIds,
        formId: section.formId,
        settings: { layout: section.layout },
      });
    }

    // 2. Materialize sections for each enabled feature via its mapping.
    for (const feature of enabledFeatures) {
      const mapping = this.findMapping(recipe, feature);
      if (!mapping) {
        continue;
      }
      const exists = sections.some((s) => s.id === feature);
      if (exists) {
        continue;
      }
      sections.push({
        id: feature,
        type: mapping.sectionType,
        content: {},
        settings: { layout: mapping.layout },
      });
      decisions.push(
        `Feature "${feature}" materialized as ${mapping.sectionType} section.`,
      );
    }

    // 3. Requirement fulfillment: ensure every required feature is satisfied.
    for (const feature of requiredFeatures) {
      const exists = sections.some((s) => s.id === feature);
      if (exists) {
        continue;
      }
      const mapping = this.findMapping(recipe, feature);
      if (mapping) {
        // Requirement is mapped; ensure a section of the mapped type exists.
        const typeExists = sections.some((s) => s.type === mapping.sectionType);
        if (!typeExists) {
          sections.push({
            id: feature,
            type: mapping.sectionType,
            content: {},
            settings: { layout: mapping.layout },
          });
          decisions.push(
            `Required feature "${feature}" satisfied via mapped ${mapping.sectionType} section.`,
          );
        }
      } else {
        // Requirement not mapped; inject a default section.
        const type = DEFAULT_REQUIRED_SECTION_TYPE[feature] ?? 'text';
        sections.push({
          id: feature,
          type,
          content: {},
          settings: { layout: 'default' },
        });
        warnings.push(
          `Required feature "${feature}" was not mapped by recipe; injected default ${type} section.`,
        );
      }
    }

    // 4. Requirement fulfillment for unmapped capabilities: inject a default
    //    section keyed by the capability name and emit a warning.
    for (const capability of unmappedRequirements) {
      const exists = sections.some((s) => s.id === capability);
      if (exists) {
        continue;
      }
      const type = DEFAULT_REQUIRED_SECTION_TYPE[capability] ?? 'text';
      sections.push({
        id: capability,
        type,
        content: {},
        settings: { layout: 'default' },
      });
      warnings.push(
        `Required capability "${capability}" was not mapped by recipe; injected default ${type} section.`,
      );
    }

    return { sections, decisions, warnings };
  }


  /** Finds the feature->section mapping for a feature, if any. */
  private findMapping(
    recipe: RecipeBlueprint,
    feature: FeatureId,
  ): SectionMappingStrategy | undefined {
    return recipe.mapping.sectionMappings.find((m) => m.feature === feature);
  }
}
