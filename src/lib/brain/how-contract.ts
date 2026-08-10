/**
 * AWIE V2 Brain — Universal HOW Contract.
 *
 * The Universal HOW Contract is the smallest semantic contract that bridges the
 * Brain's DecisionPlan (WHAT) to the V2.6 Recipe layer (HOW). It defines the
 * presentation concerns a Recipe must be able to express, WITHOUT defining how
 * React renders them.
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *   - Brain Capability: "the business needs trust" (WHAT).
 *   - HOW primitive: "the site needs a way to present trust" (HOW).
 *   These are NOT the same concept. The HOW layer never infers a Capability.
 *
 *   - The HOW layer answers only:
 *       "Can I express the DecisionPlan under these constraints?"
 *       "What HOW representation is compatible with it?"
 *   - The Brain already answered: "What does the business need?"
 *
 * STRICT CONSTRAINT: This module MUST NOT contain business logic. It is pure
 * data modeling + runtime validation + a deterministic compatibility evaluator.
 * It MUST NOT reference React, HTML, CSS, ThemeConfig, Renderer, or industry
 * names. It MUST NOT add capabilities, change capability states, or invent
 * facts/evidence.
 */

import { z } from 'zod';
import type { CapabilityId } from './capability';
import type { DecisionPlan } from './decision-plan';

/**
 * The Universal HOW Primitive vocabulary.
 *
 * A HOW primitive is a presentation concern the Recipe layer must be able to
 * express. It is NOT a Capability (business function), NOT an industry template,
 * and NOT a React component.
 *
 * The vocabulary is deliberately small. Only the four Step 06 gaps require NEW
 * primitives (collection, narrative, conversion, trust). Schedule and Location
 * are already expressible via existing V2.6 Features (hours + reservation;
 * address) and are included here only for a complete, honest vocabulary.
 */
export const HowPrimitive = {
  /** Present a set of business items (record-backed or generic). */
  Collection: 'collection',
  /** Present positioning / methodology without requiring records. */
  Narrative: 'narrative',
  /** Present a conversion action (generic, not a specific form). */
  Conversion: 'conversion',
  /** Present trust (evidence-backed or non-evidence). */
  Trust: 'trust',
  /** Present schedule / availability (via existing hours + reservation). */
  Schedule: 'schedule',
  /** Present physical location (via existing address). */
  Location: 'location',
} as const;

/** The union of all valid Universal HOW Primitive identifiers. */
export type HowPrimitiveId = (typeof HowPrimitive)[keyof typeof HowPrimitive];

/** Zod schema for a single Universal HOW Primitive identifier. */
export const howPrimitiveSchema = z.enum(
  Object.values(HowPrimitive) as [HowPrimitiveId, ...HowPrimitiveId[]]
);

/**
 * The semantic constraint keys the HOW layer may consume from the DecisionPlan.
 *
 * These are SEMANTIC constraints emitted by the Brain. The HOW layer reads them
 * to determine what representation is permissible. It never decides them.
 */
export const HowConstraintKey = {
  /** Whether a collection presentation requires concrete records. */
  CollectionRequired: 'collectionRequired',
  /** Whether a trust presentation is backed by verified evidence. */
  EvidenceBacked: 'evidenceBacked',
  /** The kind of conversion expression the Brain permits. */
  ConversionKind: 'conversionKind',
} as const;

/** The union of all valid HOW constraint keys. */
export type HowConstraintKeyValue =
  (typeof HowConstraintKey)[keyof typeof HowConstraintKey];

/** Zod schema for a HOW constraint key. */
export const howConstraintKeySchema = z.enum(
  Object.values(HowConstraintKey) as [
    HowConstraintKeyValue,
    ...HowConstraintKeyValue[],
  ]
);

/**
 * The semantic requirements a HOW primitive may impose.
 *
 * These describe what the primitive needs to be assembled faithfully. They are
 * NOT business decisions — they are presentation requirements. A primitive that
 * requires concrete records or verified evidence must NOT be assembled when the
 * DecisionPlan does not confirm those exist (this prevents fabrication).
 */
export interface HowPrimitiveRequirements {
  /** Whether this primitive requires concrete records to be assembled. */
  requiresConcreteRecords?: boolean;
  /** Whether this primitive requires verified evidence to be assembled. */
  requiresEvidence?: boolean;
}

/** Zod schema for HowPrimitiveRequirements. */
export const howPrimitiveRequirementsSchema = z.object({
  requiresConcreteRecords: z.boolean().optional(),
  requiresEvidence: z.boolean().optional(),
});

/**
 * A declarative per-recipe HOW profile.
 *
 * Declares which universal HOW primitives a recipe can express, and the
 * semantic requirements of each. This is the ADAPT that lets the bridge know
 * what a recipe can express without the recipe inferring capabilities.
 */
export interface HowPrimitiveProfile {
  /** The recipeId this profile describes. */
  recipeId: string;
  /** The HOW primitives this recipe can express, with their requirements. */
  primitives: Partial<Record<HowPrimitiveId, HowPrimitiveRequirements>>;
}

/**
 * Zod schema for HowPrimitiveProfile.
 *
 * NOTE: `z.record(enumSchema, ...)` in Zod requires ALL enum keys to be present,
 * which is wrong for a partial profile. We therefore validate the record with a
 * string key schema and refine the keys against the HOW primitive vocabulary.
 */
export const howPrimitiveProfileSchema = z
  .object({
    recipeId: z.string().min(1),
    primitives: z.record(z.string(), howPrimitiveRequirementsSchema),
  })
  .refine(
    (profile) =>
      Object.keys(profile.primitives).every((key) =>
        howPrimitiveSchema.safeParse(key).success,
      ),
    {
      message: 'HOW primitive profile contains an invalid primitive key',
      path: ['primitives'],
    },
  );


/**
 * Declarative compatibility mapping: which HOW primitives can express a given
 * Brain Capability.
 *
 * This is a COMPATIBILITY vocabulary, not a business decision. It answers
 * "which HOW primitive is capable of representing this business function?".
 * It is deliberately small and grounded in the universal HOW vocabulary.
 *
 * A capability may be expressible by more than one HOW primitive. A recipe is
 * HOW-compatible with a capability if it can express at least one of these
 * primitives under the DecisionPlan constraints.
 */
export const CAPABILITY_HOW_COMPATIBILITY: Record<
  CapabilityId,
  readonly HowPrimitiveId[]
> = {
  /** Users discover offerings — via a collection or a narrative. */
  discovery: ['collection', 'narrative'],
  /** Users purchase — via a conversion action or a collection. */
  purchase: ['conversion', 'collection'],
  /** Users book — via a conversion action or a schedule. */
  booking: ['conversion', 'schedule'],
  /** Users inquire — via a conversion action. */
  inquiry: ['conversion'],
  /** Business captures leads — via a conversion action. */
  lead_capture: ['conversion'],
  /** Physical location matters — via a location presentation. */
  location: ['location'],
  /** Trust formation — via a trust presentation. */
  trust: ['trust'],
};

/**
 * Reads a semantic constraint value from the DecisionPlan.
 *
 * The HOW layer reads constraints; it never decides them. Returns undefined if
 * the constraint is absent.
 */
export function readHowConstraint(
  plan: DecisionPlan,
  key: HowConstraintKeyValue,
): string | undefined {
  const found = plan.constraints.find((c) => c.key === key);
  return found?.value;
}

/**
 * Parses a boolean semantic constraint value.
 *
 * Returns undefined for absent or malformed values. A malformed value is NOT
 * silently coerced — the caller must treat it conservatively (no fabrication).
 */
export function readBoolConstraint(
  plan: DecisionPlan,
  key: HowConstraintKeyValue,
): boolean | undefined {
  const value = readHowConstraint(plan, key);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

/**
 * The compatibility verdict for a single HOW primitive.
 */
export interface HowPrimitiveCompatibility {
  /** The HOW primitive identifier. */
  primitive: HowPrimitiveId;
  /** Whether the recipe can express this primitive under the plan constraints. */
  verdict: 'COMPATIBLE' | 'INCOMPATIBLE';
  /** A human-readable reason for the verdict. */
  reason: string;
}

/**
 * The HOW compatibility result for a whole RecipeBlueprint against a
 * DecisionPlan.
 */
export interface HowCompatibilityResult {
  /** The recipeId that was evaluated. */
  recipeId: string;
  /** The overall verdict. INCOMPATIBLE if any required primitive is INCOMPATIBLE. */
  verdict: 'COMPATIBLE' | 'INCOMPATIBLE';
  /** Per-primitive compatibility evaluations. */
  primitives: HowPrimitiveCompatibility[];
  /** The reasons for any INCOMPATIBLE verdicts. */
  reasons: string[];
}

/**
 * Evaluates whether a recipe's HOW profile can express the ACTIVE / GENERIC
 * capabilities of a DecisionPlan under its semantic constraints.
 *
 * This is a pure, deterministic compatibility evaluation. It NEVER:
 *   - adds a capability,
 *   - changes a capability state,
 *   - infers a capability from a HOW primitive,
 *   - invents facts or evidence.
 *
 * DORMANT and DROP capabilities are preserved, never assembled. GENERIC
 * capabilities are assembled only in a form compatible with their constraints.
 *
 * The evaluation is deterministic: the same DecisionPlan + profile always
 * produces the same result.
 */
export function evaluateHowCompatibility(
  plan: DecisionPlan,
  profile: HowPrimitiveProfile,
): HowCompatibilityResult {
  const primitives: HowPrimitiveCompatibility[] = [];
  const reasons: string[] = [];

  // Collect the capabilities that must be assembled (ACTIVE / GENERIC).
  // DORMANT and DROP are preserved, never assembled.
  const required = plan.capabilities.filter(
    (c) => c.state === 'ACTIVE' || c.state === 'GENERIC',
  );

  // The set of HOW primitives the recipe can express.
  const expressible = new Set(
    Object.keys(profile.primitives) as HowPrimitiveId[],
  );

  // The set of HOW primitives required by the plan's ACTIVE / GENERIC
  // capabilities, derived declaratively (never inferred from a primitive).
  const requiredPrimitives = new Set<HowPrimitiveId>();
  for (const planned of required) {
    for (const primitive of CAPABILITY_HOW_COMPATIBILITY[planned.capability]) {
      requiredPrimitives.add(primitive);
    }
  }

  for (const primitive of requiredPrimitives) {
    const evaluation = evaluatePrimitive(plan, profile, primitive, expressible);
    primitives.push(evaluation);
    if (evaluation.verdict === 'INCOMPATIBLE') {
      reasons.push(evaluation.reason);
    }
  }

  const verdict: 'COMPATIBLE' | 'INCOMPATIBLE' =
    reasons.length > 0 ? 'INCOMPATIBLE' : 'COMPATIBLE';

  return { recipeId: profile.recipeId, verdict, primitives, reasons };
}

/**
 * Evaluates a single HOW primitive against the recipe's profile and the plan's
 * semantic constraints.
 */
function evaluatePrimitive(
  plan: DecisionPlan,
  profile: HowPrimitiveProfile,
  primitive: HowPrimitiveId,
  expressible: ReadonlySet<HowPrimitiveId>,
): HowPrimitiveCompatibility {
  const requirements = profile.primitives[primitive];

  // The recipe cannot express this primitive at all.
  if (!expressible.has(primitive)) {
    return {
      primitive,
      verdict: 'INCOMPATIBLE',
      reason: `Recipe "${profile.recipeId}" cannot express HOW primitive "${primitive}".`,
    };
  }

  // The primitive requires concrete records, but the plan does not confirm
  // records exist (collectionRequired !== true). Assembling it would fabricate.
  if (requirements?.requiresConcreteRecords) {
    const collectionRequired = readBoolConstraint(
      plan,
      HowConstraintKey.CollectionRequired,
    );
    if (collectionRequired !== true) {
      return {
        primitive,
        verdict: 'INCOMPATIBLE',
        reason: `HOW primitive "${primitive}" requires concrete records, but the DecisionPlan does not confirm records exist (collectionRequired !== true); assembling it would fabricate data.`,
      };
    }
  }

  // The primitive requires verified evidence, but the plan does not confirm
  // evidence exists (evidenceBacked !== true). Assembling it would invent
  // testimonials / customer evidence.
  if (requirements?.requiresEvidence) {
    const evidenceBacked = readBoolConstraint(
      plan,
      HowConstraintKey.EvidenceBacked,
    );
    if (evidenceBacked !== true) {
      return {
        primitive,
        verdict: 'INCOMPATIBLE',
        reason: `HOW primitive "${primitive}" requires verified evidence, but the DecisionPlan does not confirm evidence exists (evidenceBacked !== true); assembling it would invent testimonials.`,
      };
    }
  }

  return {
    primitive,
    verdict: 'COMPATIBLE',
    reason: `Recipe "${profile.recipeId}" can express HOW primitive "${primitive}" under the DecisionPlan constraints.`,
  };
}


