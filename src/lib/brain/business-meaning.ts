/**
 * AWIE V2 Brain — BusinessMeaning contract.
 *
 * BusinessMeaning is the normalized, semantic representation of what the
 * business IS and what it NEEDS. It is the output of Semantic Normalization and
 * the primary input to the Decision Engine.
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *   - BusinessMeaning is semantic. It MUST NOT contain React types, HTML, CSS,
 *     component names, concrete UI layout decisions, ThemeConfig, or Recipe
 *     implementation details.
 *   - BusinessMeaning does NOT decide UI structure. It only records business
 *     meaning.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data modeling + runtime validation.
 */

import { z } from 'zod';
import { capabilityIdSchema, type CapabilityId } from './capability';
import { evidenceSetSchema, type EvidenceSet } from './evidence';

/**
 * The primary business intent of the site.
 *
 * This is a semantic intent, not a UI decision. It describes the dominant
 * purpose the website must serve for the business.
 */
export const BusinessIntent = {
  /** The site primarily informs / educates visitors. */
  inform: 'inform',
  /** The site primarily converts visitors into customers. */
  convert: 'convert',
  /** The site primarily showcases work / portfolio. */
  showcase: 'showcase',
  /** The site primarily enables transactions. */
  transact: 'transact',
  /** The site primarily enables booking / scheduling. */
  book: 'book',
  /** The site primarily establishes trust / credibility. */
  establish_trust: 'establish_trust',
} as const;

/** The union of all valid BusinessIntent values. */
export type BusinessIntentValue =
  (typeof BusinessIntent)[keyof typeof BusinessIntent];

/** Zod schema for a BusinessIntent value. */
export const businessIntentSchema = z.enum(
  Object.values(BusinessIntent) as [BusinessIntentValue, ...BusinessIntentValue[]]
);

/**
 * A semantic trait of the business.
 *
 * Traits are normalized business facts that inform the Decision Engine. They
 * are semantic and carry no UI information.
 */
export interface BusinessTrait {
  /** A stable semantic key for the trait. */
  key: string;
  /** The trait value. */
  value: string;
  /** Evidence supporting this trait, preserving provenance. */
  evidence?: EvidenceSet;
}

/** Zod schema for a BusinessTrait. */
export const businessTraitSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  evidence: evidenceSetSchema.optional(),
});

/**
 * BusinessMeaning — the normalized semantic representation of the business.
 *
 * This is the contract produced by Semantic Normalization and consumed by the
 * Decision Engine. It is deliberately free of any UI / layout / component
 * concepts.
 */
export interface BusinessMeaning {
  /** A stable identifier for this meaning instance. */
  id: string;
  /** The primary business intent. */
  primaryIntent: BusinessIntentValue;
  /** Optional secondary intent. */
  secondaryIntent?: BusinessIntentValue;
  /** Semantic traits of the business. */
  traits: BusinessTrait[];
  /** Capabilities the business meaning implies (semantic only). */
  impliedCapabilities: CapabilityId[];
  /** Evidence supporting the overall meaning. */
  evidence: EvidenceSet[];
}

/** Zod schema for BusinessMeaning. */
export const businessMeaningSchema = z.object({
  id: z.string().min(1),
  primaryIntent: businessIntentSchema,
  secondaryIntent: businessIntentSchema.optional(),
  traits: z.array(businessTraitSchema),
  impliedCapabilities: z.array(capabilityIdSchema),
  evidence: z.array(evidenceSetSchema),
});
