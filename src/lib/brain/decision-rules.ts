/**
 * AWIE V2 Brain — Decision Rule Grammar v1.
 *
 * The Decision Rule Grammar converts normalized BusinessMeaning into semantic
 * Capability candidates. It is the deterministic authority for WHAT the website
 * needs. It is completely blind to HOW the website is rendered.
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *   - Rules answer "Given this normalized business meaning, which semantic
 *     capabilities are required?" — never "Which component should render it?".
 *   - A rule MUST NOT contain React, HTML, CSS, component names, layout names,
 *     Recipe IDs, Renderer IDs, URLs, or page names.
 *   - A rule result may only produce semantic Capability candidates and their
 *     decision metadata (priority, role, state).
 *   - Rules MUST NOT branch on industry names (e.g. `if industry === "bakery"`).
 *     Industry-specific knowledge belongs to the Knowledge Layer, not here.
 *
 * STRICT CONSTRAINT: This module is PURE. Rules are deterministic pure functions
 * over semantic input. No LLM, no randomness, no external API, no UI inspection.
 */

import type { BusinessMeaning } from './business-meaning';
import {
  CapabilityPriority,
  type CapabilityPriorityValue,
} from './decision-plan';
import {
  CapabilityRole,
  type CapabilityRoleValue,
} from './decision-plan';
import {
  CapabilityState,
  type CapabilityStateValue,
} from './capability';
import type { CapabilityId } from './capability';

/**
 * The semantic trait keys the Decision Rules may inspect.
 *
 * These are stable, industry-independent semantic signals that Semantic
 * Normalization may attach to a BusinessMeaning. They are NOT UI concepts and
 * NOT industry names. A rule may only read these keys — never raw UI or
 * industry terminology.
 */
export const SemanticTraitKey = {
  /** The business sells a product or service for money. */
  transaction: 'transaction',
  /** The business operates by appointment / scheduled slots. */
  appointment: 'appointment',
  /** The business expects customer-initiated contact / questions. */
  inquiry: 'inquiry',
  /** The business has a physical location visitors may need to find. */
  physical_presence: 'physical_presence',
  /** Trust formation is important to the business's conversion. */
  trust_requirement: 'trust_requirement',
  /** The business needs visitors to discover its offerings. */
  discovery_requirement: 'discovery_requirement',
  /** The business captures leads for follow-up. */
  lead_generation: 'lead_generation',
} as const;

/** The union of all valid SemanticTraitKey values. */
export type SemanticTraitKeyValue =
  (typeof SemanticTraitKey)[keyof typeof SemanticTraitKey];

/**
 * A semantic Capability candidate produced by a rule.
 *
 * This is the ONLY thing a rule may produce. It carries the semantic capability
 * and its decision metadata. It carries NO UI / layout / component / Recipe
 * information.
 */
export interface CapabilityCandidate {
  /** The semantic capability identifier. */
  capability: CapabilityId;
  /** The semantic priority of this capability. */
  priority: CapabilityPriorityValue;
  /** The role of this capability in the composite business model. */
  role: CapabilityRoleValue;
  /** The resolved state of this capability. */
  state: CapabilityStateValue;
}

/**
 * A deterministic Decision Rule.
 *
 * A rule pairs a semantic condition (a pure predicate over BusinessMeaning)
 * with a semantic result (a CapabilityCandidate). Rules are evaluated in a
 * fixed, deterministic order by the Rule Engine.
 */
export interface DecisionRule {
  /** A stable identifier for this rule. */
  id: string;
  /** A human-readable semantic description of the rule. */
  description: string;
  /**
   * The semantic condition. Returns true when the rule applies to the given
   * BusinessMeaning. MUST be a pure function with no side effects.
   */
  condition: (meaning: BusinessMeaning) => boolean;
  /** The semantic capability candidate produced when the condition holds. */
  result: CapabilityCandidate;
}

/**
 * Helper: read whether a semantic trait is present on a BusinessMeaning.
 *
 * A trait is present when a BusinessTrait with the given key exists. The value
 * is not interpreted here — presence is the semantic signal. This keeps rules
 * free of industry-specific value branching.
 */
export function hasTrait(
  meaning: BusinessMeaning,
  key: SemanticTraitKeyValue
): boolean {
  return meaning.traits.some((trait) => trait.key === key);
}

/**
 * The canonical Decision Rule set v1.
 *
 * Each rule maps a semantic signal to a semantic capability candidate. The set
 * is deliberately small and industry-agnostic. Rules are evaluated in array
 * order; the Rule Engine merges duplicate candidates deterministically.
 *
 * NOTE ON AI LEAK PREVENTION: These rules derive capabilities ONLY from
 * `primaryIntent`, `secondaryIntent`, and semantic `traits`. They NEVER read
 * `BusinessMeaning.impliedCapabilities`. That field is treated as a
 * non-authoritative AI hint and is deliberately ignored by the Rule Engine so
 * that AI-provided capability suggestions cannot bypass the Decision Engine.
 */
export const DECISION_RULES: readonly DecisionRule[] = [
  {
    id: 'rule.discovery',
    description:
      'If the business needs visitors to discover its offerings, discovery is required.',
    condition: (meaning) =>
      meaning.primaryIntent === 'inform' ||
      meaning.primaryIntent === 'showcase' ||
      hasTrait(meaning, SemanticTraitKey.discovery_requirement),
    result: {
      capability: 'discovery',
      priority: CapabilityPriority.BUSINESS_CRITICAL,
      role: CapabilityRole.PRIMARY,
      state: CapabilityState.ACTIVE,
    },
  },
  {
    id: 'rule.purchase',
    description:
      'If the business meaning indicates a transactional purchase, purchase is required.',
    condition: (meaning) =>
      meaning.primaryIntent === 'transact' ||
      hasTrait(meaning, SemanticTraitKey.transaction),
    result: {
      capability: 'purchase',
      priority: CapabilityPriority.CONVERSION_CRITICAL,
      role: CapabilityRole.PRIMARY,
      state: CapabilityState.ACTIVE,
    },
  },
  {
    id: 'rule.booking',
    description:
      'If the business meaning indicates an appointment-based service, booking is required.',
    condition: (meaning) =>
      meaning.primaryIntent === 'book' ||
      hasTrait(meaning, SemanticTraitKey.appointment),
    result: {
      capability: 'booking',
      priority: CapabilityPriority.CONVERSION_CRITICAL,
      role: CapabilityRole.PRIMARY,
      state: CapabilityState.ACTIVE,
    },
  },
  {
    id: 'rule.inquiry',
    description:
      'If the business meaning indicates customer inquiry, inquiry is required.',
    condition: (meaning) =>
      meaning.primaryIntent === 'convert' ||
      hasTrait(meaning, SemanticTraitKey.inquiry),
    result: {
      capability: 'inquiry',
      priority: CapabilityPriority.CONVERSION_CRITICAL,
      role: CapabilityRole.PRIMARY,
      state: CapabilityState.ACTIVE,
    },
  },
  {
    id: 'rule.lead_capture',
    description:
      'If the business meaning indicates lead generation, lead_capture is required.',
    condition: (meaning) =>
      hasTrait(meaning, SemanticTraitKey.lead_generation) ||
      meaning.secondaryIntent === 'convert',
    result: {
      capability: 'lead_capture',
      priority: CapabilityPriority.BUSINESS_CRITICAL,
      role: CapabilityRole.SUPPORTING,
      state: CapabilityState.ACTIVE,
    },
  },
  {
    id: 'rule.location',
    description:
      'If the business has a physical presence visitors need to find, location is required.',
    condition: (meaning) =>
      hasTrait(meaning, SemanticTraitKey.physical_presence),
    result: {
      capability: 'location',
      priority: CapabilityPriority.SUPPORTING,
      role: CapabilityRole.SUPPORTING,
      state: CapabilityState.ACTIVE,
    },
  },
  {
    id: 'rule.trust',
    description:
      'If trust formation is important to conversion, trust is required.',
    condition: (meaning) =>
      meaning.primaryIntent === 'establish_trust' ||
      hasTrait(meaning, SemanticTraitKey.trust_requirement),
    result: {
      capability: 'trust',
      priority: CapabilityPriority.BUSINESS_CRITICAL,
      role: CapabilityRole.SUPPORTING,
      state: CapabilityState.ACTIVE,
    },
  },
];
