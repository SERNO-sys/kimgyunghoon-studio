/**
 * AWIE V2 Brain — DecisionContext contract.
 *
 * DecisionContext represents the normalized information available to the
 * Decision Engine. It is the semantic input the Decision Engine consumes to
 * produce a DecisionPlan.
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *   - DecisionContext is SEMANTIC. It MUST NOT contain React types, HTML, CSS,
 *     component names, concrete UI layout decisions, ThemeConfig, or Recipe
 *     implementation details.
 *   - DecisionContext may contain: normalized business meaning, capabilities /
 *     semantic traits, evidence information, relevant preferences/intents, and
 *     decision constraints.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data modeling + runtime validation.
 */

import { z } from 'zod';
import { businessMeaningSchema, type BusinessMeaning } from './business-meaning';
import { capabilityIdSchema, type CapabilityId } from './capability';
import { evidenceSetSchema, type EvidenceSet } from './evidence';

/**
 * A decision constraint.
 *
 * Constraints bound the Decision Engine's choices. They are semantic and carry
 * no UI information. The Decision Engine interprets them; this module only
 * models them.
 */
export interface DecisionConstraint {
  /** A stable semantic key for the constraint. */
  key: string;
  /** The constraint value. */
  value: string;
  /** Optional evidence supporting the constraint. */
  evidence?: EvidenceSet;
}

/** Zod schema for a DecisionConstraint. */
export const decisionConstraintSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  evidence: evidenceSetSchema.optional(),
});

/**
 * A relevant preference or intent supplied by the user.
 *
 * Preferences are semantic signals (e.g. "modern", "trustworthy", "minimal")
 * that inform the Decision Engine. They are NOT UI decisions.
 */
export interface UserPreference {
  /** A stable semantic key for the preference. */
  key: string;
  /** The preference value. */
  value: string;
}

/** Zod schema for a UserPreference. */
export const userPreferenceSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

/**
 * DecisionContext — the normalized semantic input to the Decision Engine.
 *
 * This is the contract produced by Semantic Normalization and consumed by the
 * Decision Engine. It is deliberately free of any UI / layout / component
 * concepts.
 */
export interface DecisionContext {
  /** A stable identifier for this context instance. */
  id: string;
  /** The normalized business meaning. */
  businessMeaning: BusinessMeaning;
  /** Capabilities / semantic traits available to the decision. */
  capabilities: CapabilityId[];
  /** Evidence information available to the decision. */
  evidence: EvidenceSet[];
  /** Relevant preferences / intents supplied by the user. */
  preferences: UserPreference[];
  /** Decision constraints that bound the decision. */
  constraints: DecisionConstraint[];
}

/**
 * Zod schema for DecisionContext.
 *
 * STRICT: unknown keys are rejected. This enforces the architectural boundary
 * that DecisionContext cannot carry UI/component/layout decisions — any
 * unrecognized field (e.g. `components`, `layout`, `css`) is a violation.
 */
export const decisionContextSchema = z
  .object({
    id: z.string().min(1),
    businessMeaning: businessMeaningSchema,
    capabilities: z.array(capabilityIdSchema),
    evidence: z.array(evidenceSetSchema),
    preferences: z.array(userPreferenceSchema),
    constraints: z.array(decisionConstraintSchema),
  })
  .strict();


