/**
 * AWIE V2 Brain — DecisionPlan contract.
 *
 * DecisionPlan is the OUTPUT of the Decision Engine. It describes WHAT the
 * website needs. It MUST NOT describe HOW the website is rendered.
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *   - DecisionPlan MUST NOT contain Hero.tsx, ProductGrid, CSS classes, grid
 *     columns, pixel spacing, React components, or concrete visual variants.
 *   - DecisionPlan expresses: selected semantic capabilities, their state,
 *     semantic constraints, primary/secondary/supporting intent where required,
 *     dormant capabilities, and content requirements/constraints.
 *
 * The structure follows the frozen Brain architecture:
 *   DecisionPlan
 *   ├── capabilities
 *   ├── businessModels
 *   ├── priorities
 *   ├── constraints
 *   ├── semanticSlots
 *   └── provenance
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data modeling + runtime validation.
 */

import { z } from 'zod';
import {
  capabilityDecisionSchema,
  capabilityIdSchema,
  type CapabilityDecision,
  type CapabilityId,
} from './capability';
import { evidenceSetSchema, type EvidenceSet } from './evidence';

/**
 * The priority of a capability in the site.
 *
 * This is a SEMANTIC priority, not a UI ordering. It follows the frozen Budget
 * Grammar (MANDATORY → CONVERSION_CRITICAL → BUSINESS_CRITICAL → SUPPORTING →
 * DECORATIVE). Evidence quantity must NOT determine business importance.
 */
export const CapabilityPriority = {
  MANDATORY: 'MANDATORY',
  CONVERSION_CRITICAL: 'CONVERSION_CRITICAL',
  BUSINESS_CRITICAL: 'BUSINESS_CRITICAL',
  SUPPORTING: 'SUPPORTING',
  DECORATIVE: 'DECORATIVE',
} as const;

/** The union of all valid CapabilityPriority values. */
export type CapabilityPriorityValue =
  (typeof CapabilityPriority)[keyof typeof CapabilityPriority];

/** Zod schema for a CapabilityPriority value. */
export const capabilityPrioritySchema = z.enum(
  Object.values(CapabilityPriority) as [
    CapabilityPriorityValue,
    ...CapabilityPriorityValue[],
  ]
);

/**
 * The role of a capability within a composite business model.
 *
 * Primary / Secondary / Supporting express the composite business model
 * structure. One CTA must not force the deletion of another business model.
 */
export const CapabilityRole = {
  PRIMARY: 'PRIMARY',
  SECONDARY: 'SECONDARY',
  SUPPORTING: 'SUPPORTING',
} as const;

/** The union of all valid CapabilityRole values. */
export type CapabilityRoleValue =
  (typeof CapabilityRole)[keyof typeof CapabilityRole];

/** Zod schema for a CapabilityRole value. */
export const capabilityRoleSchema = z.enum(
  Object.values(CapabilityRole) as [CapabilityRoleValue, ...CapabilityRoleValue[]]
);

/**
 * A semantic constraint on the site.
 *
 * Constraints are semantic boundaries the Decision Engine records. They are NOT
 * UI decisions. They bound what Recipes may later implement.
 */
export interface SemanticConstraint {
  /** A stable semantic key for the constraint. */
  key: string;
  /** The constraint value. */
  value: string;
}

/** Zod schema for a SemanticConstraint. */
export const semanticConstraintSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

/**
 * A content requirement.
 *
 * Content requirements describe WHAT content the site needs (semantically),
 * not how it is presented. They are the semantic bridge to the Content Plan.
 */
export interface ContentRequirement {
  /** A stable semantic key for the requirement. */
  key: string;
  /** A semantic description of the required content. */
  description: string;
  /** Whether this content is required or optional. */
  required: boolean;
}

/** Zod schema for a ContentRequirement. */
export const contentRequirementSchema = z.object({
  key: z.string().min(1),
  description: z.string().min(1),
  required: z.boolean(),
});

/**
 * A capability entry in the DecisionPlan.
 *
 * Each entry records a selected semantic capability, its state, its priority,
 * and its role in the composite business model. It carries NO UI information.
 */
export interface PlannedCapability {
  /** The semantic capability identifier. */
  capability: CapabilityId;
  /** The resolved state of this capability. */
  state: CapabilityDecision['state'];
  /** The semantic priority of this capability. */
  priority: CapabilityPriorityValue;
  /** The role of this capability in the composite business model. */
  role: CapabilityRoleValue;
}

/** Zod schema for a PlannedCapability. */
export const plannedCapabilitySchema = z.object({
  capability: capabilityIdSchema,
  state: capabilityDecisionSchema.shape.state,
  priority: capabilityPrioritySchema,
  role: capabilityRoleSchema,
});

/**
 * DecisionPlan — the output of the Decision Engine.
 *
 * Describes WHAT the website needs at the semantic level. It is deliberately
 * free of any UI / layout / component / Recipe concepts.
 */
export interface DecisionPlan {
  /** A stable identifier for this plan instance. */
  id: string;
  /** The selected semantic capabilities and their states. */
  capabilities: PlannedCapability[];
  /** Semantic constraints that bound the site. */
  constraints: SemanticConstraint[];
  /** Content requirements / constraints. */
  contentRequirements: ContentRequirement[];
  /** Evidence supporting the decisions. */
  evidence: EvidenceSet[];
}

/** Zod schema for DecisionPlan. */
export const decisionPlanSchema = z.object({
  id: z.string().min(1),
  capabilities: z.array(plannedCapabilitySchema),
  constraints: z.array(semanticConstraintSchema),
  contentRequirements: z.array(contentRequirementSchema),
  evidence: z.array(evidenceSetSchema),
});
