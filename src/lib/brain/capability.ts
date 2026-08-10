/**
 * AWIE V2 Brain — Capability Vocabulary v1 & CapabilityState contracts.
 *
 * A Capability represents a BUSINESS FUNCTION the generated website may need to
 * support. It is the semantic vocabulary the Decision Engine operates on.
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *   - A Capability is NOT an industry name.
 *   - A Capability is NOT a UI component, section, layout, CSS, route, or
 *     visual variant.
 *   - A Capability is NOT a Recipe.
 *   - A Capability is NOT an Evidence concept (testimonial, case_study,
 *     credentials, reviews, certifications, client_logos).
 *   - A Capability is NOT a Content requirement (portfolio, methodology,
 *     schedule, operating_hours, availability, event, performance).
 *
 * Capability answers "WHAT business function is required?" — never
 * "HOW should it be displayed?".
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data modeling + runtime validation + vocabulary metadata.
 */

import { z } from 'zod';

/**
 * The canonical Capability Vocabulary v1.
 *
 * These are the ONLY values the Decision Engine may reference as capabilities.
 * The vocabulary is deliberately small, orthogonal, and composable. It is
 * industry-independent: an unknown business category must not require a new
 * Capability ID.
 *
 * Each entry is a distinct business function with distinct decision semantics.
 */
export const Capability = {
  /** Users can discover the business's products, services, or offerings. */
  discovery: 'discovery',
  /** Users can purchase a product or service. */
  purchase: 'purchase',
  /** Users can book an appointment, slot, or resource. */
  booking: 'booking',
  /** Users can submit an inquiry / contact the business. */
  inquiry: 'inquiry',
  /** The business captures leads for follow-up. */
  leadCapture: 'lead_capture',
  /** The physical location is important to the business experience. */
  location: 'location',
  /** Trust formation is important to conversion. */
  trust: 'trust',
} as const;

/** The union of all valid canonical Capability identifiers. */
export type CapabilityId = (typeof Capability)[keyof typeof Capability];

/** Zod schema for a single canonical Capability identifier. */
export const capabilityIdSchema = z.enum(
  Object.values(Capability) as [CapabilityId, ...CapabilityId[]]
);

/**
 * Semantic metadata for a canonical Capability.
 *
 * This is the minimum metadata required to make each Capability's meaning
 * unambiguous. It is NOT a registry/ontology system.
 */
export interface CapabilityDefinition {
  /** The canonical Capability identifier. */
  id: CapabilityId;
  /** A semantic definition of the business function. */
  definition: string;
  /** Always true for canonical entries — the concept is a genuine business capability. */
  isBusinessCapability: true;
  /** Semantic aliases that normalize to this canonical Capability. */
  aliases: readonly string[];
}

/**
 * The canonical Capability definitions, keyed by CapabilityId.
 *
 * The canonical vocabulary is the source of truth. Aliases never become
 * independent Capability IDs.
 */
export const CAPABILITY_DEFINITIONS: Record<CapabilityId, CapabilityDefinition> = {
  [Capability.discovery]: {
    id: Capability.discovery,
    definition:
      'Users can discover the business\'s products, services, or offerings.',
    isBusinessCapability: true,
    aliases: ['product_discovery', 'service_discovery', 'content_discovery'],
  },
  [Capability.purchase]: {
    id: Capability.purchase,
    definition: 'Users can purchase a product or service.',
    isBusinessCapability: true,
    aliases: ['buy', 'checkout', 'order'],
  },
  [Capability.booking]: {
    id: Capability.booking,
    definition: 'Users can book an appointment, slot, or resource.',
    isBusinessCapability: true,
    aliases: ['reservation', 'appointment', 'schedule_booking'],
  },
  [Capability.inquiry]: {
    id: Capability.inquiry,
    definition: 'Users can submit an inquiry or contact the business.',
    isBusinessCapability: true,
    aliases: ['contact', 'contact_us', 'message', 'get_in_touch'],
  },
  [Capability.leadCapture]: {
    id: Capability.leadCapture,
    definition: 'The business captures leads for follow-up.',
    isBusinessCapability: true,
    aliases: ['lead', 'lead_generation', 'signup'],
  },
  [Capability.location]: {
    id: Capability.location,
    definition: 'The physical location is important to the business experience.',
    isBusinessCapability: true,
    aliases: ['address', 'directions', 'map'],
  },
  [Capability.trust]: {
    id: Capability.trust,
    definition: 'Trust formation is important to conversion.',
    isBusinessCapability: true,
    aliases: ['credibility', 'reputation'],
  },
};

/**
 * A flat alias → canonical CapabilityId map.
 *
 * Used for semantic normalization. Unknown or invalid terms are NOT present in
 * this map and therefore fail normalization rather than creating a new
 * Capability.
 */
export const CAPABILITY_ALIASES: Readonly<Record<string, CapabilityId>> =
  Object.values(CAPABILITY_DEFINITIONS).reduce<Record<string, CapabilityId>>(
    (acc, def) => {
      acc[def.id] = def.id;
      for (const alias of def.aliases) {
        acc[alias] = def.id;
      }
      return acc;
    },
    {}
  );

/**
 * Normalize a raw term to its canonical CapabilityId.
 *
 * Returns the canonical CapabilityId if the input is a canonical ID or a known
 * semantic alias. Returns null for unknown/invalid terms — it never silently
 * creates a new Capability.
 */
export function normalizeCapability(input: string): CapabilityId | null {
  return CAPABILITY_ALIASES[input] ?? null;
}

/**
 * The CapabilityState.
 *
 * Exactly four states are supported. State transition logic is NOT implemented
 * here — that belongs to the Decision Engine.
 *
 *   ACTIVE   — sufficient evidence and data to implement concretely.
 *   GENERIC  — business meaning is clear but concrete data is insufficient.
 *   DORMANT  — not exposed now, but may be activated later via CMS/data entry.
 *   DROP     — excluded from the current site scope and budget.
 */
export const CapabilityState = {
  ACTIVE: 'ACTIVE',
  GENERIC: 'GENERIC',
  DORMANT: 'DORMANT',
  DROP: 'DROP',
} as const;

/** The union of all valid CapabilityState values. */
export type CapabilityStateValue =
  (typeof CapabilityState)[keyof typeof CapabilityState];

/** Zod schema for a CapabilityState value. */
export const capabilityStateSchema = z.enum(
  Object.values(CapabilityState) as [
    CapabilityStateValue,
    ...CapabilityStateValue[],
  ]
);

/**
 * A Capability with its resolved state.
 *
 * This is the semantic unit the Decision Engine produces and the DecisionPlan
 * records. It carries the capability identifier and its state. It does NOT
 * carry any UI, layout, or component information.
 */
export interface CapabilityDecision {
  /** The semantic capability identifier. */
  capability: CapabilityId;
  /** The resolved state of this capability. */
  state: CapabilityStateValue;
}

/** Zod schema for a CapabilityDecision. */
export const capabilityDecisionSchema = z.object({
  capability: capabilityIdSchema,
  state: capabilityStateSchema,
});
