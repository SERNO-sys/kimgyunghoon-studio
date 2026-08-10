/**
 * AWIE V2 Brain — Evidence / Provenance contracts.
 *
 * Evidence preserves PROVENANCE: the origin of a piece of information. The
 * contract distinguishes the architectural origin of information so that later
 * layers (Fact Validator, Decision Engine) can reason about trust.
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *   - Provenance is NOT equivalent to truth. A source alone does not make a
 *     fact verified. In particular `user_asserted` ≠ `system_verified`.
 *   - This module does NOT implement the full Evidence Gate. It only establishes
 *     the provenance substrate that the Evidence Gate will later consume.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data modeling + runtime validation.
 */

import { z } from 'zod';

/**
 * The provenance of a piece of information.
 *
 * These values preserve the architectural distinction between origins of
 * information. They are ordered from least to most trusted ONLY as a
 * documentation aid — the Decision Engine / Fact Validator decides how to use
 * them. A source alone never implies verification.
 */
export const Provenance = {
  /** Asserted by the user (e.g. onboarding answers). NOT verified. */
  user_asserted: 'user_asserted',
  /** Originated from CMS content. */
  cms: 'cms',
  /** Imported from an external source (e.g. migration, third-party). */
  imported: 'imported',
  /** Verified by the system (e.g. passed the Fact Validator). */
  system_verified: 'system_verified',
} as const;

/** The union of all valid Provenance values. */
export type ProvenanceValue = (typeof Provenance)[keyof typeof Provenance];

/** Zod schema for a Provenance value. */
export const provenanceSchema = z.enum(
  Object.values(Provenance) as [ProvenanceValue, ...ProvenanceValue[]]
);

/**
 * A single piece of evidence.
 *
 * Evidence is a claim about the business that carries its provenance. It does
 * NOT carry any UI, layout, or component information.
 */
export interface Evidence {
  /** Stable identifier for this evidence item. */
  id: string;
  /** The provenance / origin of this evidence. */
  provenance: ProvenanceValue;
  /** A semantic label describing what the evidence supports. */
  claim: string;
  /** Optional free-form detail. Kept minimal; no business logic here. */
  detail?: string;
}

/** Zod schema for a single Evidence item. */
export const evidenceSchema = z.object({
  id: z.string().min(1),
  provenance: provenanceSchema,
  claim: z.string().min(1),
  detail: z.string().optional(),
});

/**
 * A collection of evidence attached to a semantic subject (e.g. a capability
 * or a business meaning). Preserves provenance per item.
 */
export interface EvidenceSet {
  /** The semantic subject these evidence items support. */
  subject: string;
  /** The evidence items. */
  items: Evidence[];
}

/** Zod schema for an EvidenceSet. */
export const evidenceSetSchema = z.object({
  subject: z.string().min(1),
  items: z.array(evidenceSchema),
});
