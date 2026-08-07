/**
 * AWIE V2 - Phase 11: Accessibility Service.
 *
 * The Accessibility service is a PLATFORM SERVICE that derives accessibility
 * attributes for semantic components. It produces accessibility data that the
 * Renderer and Adapters consume.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * The Accessibility service is the EXECUTION layer. It:
 *   1. ENSURES - guarantees accessibility attributes for semantic components.
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - It NEVER imports BusinessBrief, IndustryProfile,
 *      or RecipeBlueprint. It operates ONLY on semantic component ids.
 *   2. ZERO RENDERING - It NEVER renders UI. It only produces attributes.
 *   3. DETERMINISM - Same component id -> same attributes. No randomness.
 *   4. O(1) LOOKUP - Uses a Map for O(1) attribute lookup. No Array.find().
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import { BaseService } from './core';
import type { RuntimeEventBus } from './core';
import type { AccessibilityAttributes, AccessibilityService } from './types';

/**
 * The default Accessibility service.
 *
 * Derives accessibility attributes for semantic components. Each semantic
 * component id maps to a deterministic set of ARIA attributes. The mapping is
 * generic and semantic — it never encodes business-specific vocabulary.
 *
 * The service is deterministic: the same component id always produces the same
 * attributes.
 *
 * It implements the UNIVERSAL RuntimeService contract (lifecycle + health) and
 * emits "accessibility:attributes" events on the RuntimeEventBus for
 * observability.
 */
export class DefaultAccessibility
  extends BaseService
  implements AccessibilityService
{
  /** The stable service id. */
  readonly id = 'accessibility' as const;

  /** The O(1) semantic component -> role mapping. */
  private readonly roleMap: ReadonlyMap<string, string> = new Map([
    ['hero', 'banner'],
    ['featureGrid', 'region'],
    ['faq', 'region'],
    ['cta', 'region'],
    ['contact', 'region'],
    ['footer', 'contentinfo'],
    ['nav', 'navigation'],
    ['form', 'form'],
  ]);

  /**
   * Constructs a DefaultAccessibility.
   *
   * @param bus The optional RuntimeEventBus for observability.
   */
  constructor(bus?: RuntimeEventBus) {
    super(bus);
  }

  /**
   * Builds accessibility attributes for a semantic component.
   *
   * @param componentId The semantic component id (e.g. "hero", "featureGrid").
   * @param label An optional accessible label.
   * @returns The accessibility attributes.
   */
  attributes(componentId: string, label?: string): AccessibilityAttributes {
    const role = this.roleMap.get(componentId);
    const attrs: AccessibilityAttributes = {};

    if (role) {
      attrs.role = role;
    }
    if (label) {
      attrs['aria-label'] = label;
    }

    this.emit('accessibility:attributes', { componentId, role });
    return attrs;
  }
}


