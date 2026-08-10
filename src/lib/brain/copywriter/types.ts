/**
 * AWIE V2 Brain — AI #2 Copywriter contract (Step 11).
 *
 * AI #2 is the EXPRESSION LAYER. Its ONLY responsibility is:
 *
 *   "Express the content requirements already defined by ContentPlan."
 *
 * PIPELINE POSITION (Architecture Brain Freeze v1.0):
 *
 *   DecisionPlan
 *     ↓
 *   ContentPlan
 *     ↓
 *   AI #2                    ← THIS STEP (expression only)
 *     ↓
 *   Fact Validator
 *     ↓
 *   ThemeConfig
 *
 * AI #2 does NOT decide:
 *   - capabilities,
 *   - capability states,
 *   - business models,
 *   - page structure / sections / components / layouts,
 *   - recipes / themes / design,
 *   - evidence requirements,
 *   - business facts.
 *
 * The program has already decided all of these before AI #2.
 *
 * INPUT BOUNDARY:
 *   AI #2 receives a ContentPlan. It MUST NOT receive DecisionContext,
 *   RecipeBlueprint, ThemeConfig, React components, CSS, or layout definitions.
 *   ContentPlan is the authoritative instruction boundary.
 *
 * OUTPUT BOUNDARY:
 *   AI #2 output contains expression/content data only. It MUST NOT contain
 *   component IDs, layout IDs, recipe IDs, theme tokens, CSS, HTML, or
 *   capability decisions.
 *
 * FACT BOUNDARY:
 *   AI #2 MUST NOT invent concrete business facts. When ContentPlan says content
 *   is GENERIC, AI #2 must produce generic-safe language. Concrete facts may be
 *   referenced ONLY when explicitly permitted by the ContentPlan requirement's
 *   `evidenceRefs`.
 *
 * PROVIDER INDEPENDENCE:
 *   This module defines a provider-independent interface. It does NOT connect to
 *   any external LLM API. A future LLM adapter may implement the interface.
 *
 * STRICT CONSTRAINT: This module MUST NOT import React, HTML, CSS, ThemeConfig,
 * Renderer, or any UI concept. It MUST NOT generate or rewrite content. It MUST
 * NOT infer new business facts. It MUST NOT modify ContentPlan.
 */

import { z } from 'zod';
import type { ContentPlan } from '../content-plan';
import type { ProvenanceValue } from '../evidence';

/**
 * A single generated content item produced by AI #2.
 *
 * This is the OUTPUT contract. It is intentionally structurally compatible with
 * the Fact Validator's `GeneratedContentItem` so that AI #2 output can be passed
 * directly to the Fact Validator without transformation.
 *
 * Each item MUST identify the ContentPlan requirement it satisfies
 * (`requirementId`). It carries NO UI / layout / component / theme information.
 */
export interface GeneratedContent {
  /** A stable identifier for this generated content item. */
  id: string;
  /** The ContentPlan requirement id this content satisfies. */
  requirementId: string;
  /** The generated content body (expression/text only). */
  body: string;
  /**
   * The concrete fact references this content claims to use.
   *
   * These MUST be evidence ids permitted by the ContentPlan requirement's
   * `evidenceRefs`. AI #2 may only attach references that are explicitly
   * permitted; it MUST NOT invent references.
   */
  factReferences: string[];
}

/** Zod schema for a GeneratedContent item. */
export const generatedContentSchema = z.object({
  id: z.string().min(1),
  requirementId: z.string().min(1),
  body: z.string().min(1),
  factReferences: z.array(z.string()),
});

/**
 * The AI #2 output — a collection of generated content items.
 *
 * This is the complete output of the expression layer. It contains expression
 * data only. It MUST NOT contain component IDs, layout IDs, recipe IDs, theme
 * tokens, CSS, HTML, or capability decisions.
 */
export interface GeneratedContentSet {
  /** A stable identifier for this generation instance. */
  id: string;
  /** The ContentPlan id this output derives from. */
  contentPlanId: string;
  /** The generated content items. */
  items: GeneratedContent[];
}

/** Zod schema for a GeneratedContentSet. */
export const generatedContentSetSchema = z.object({
  id: z.string().min(1),
  contentPlanId: z.string().min(1),
  items: z.array(generatedContentSchema),
});

/**
 * The tone / expression constraint vocabulary.
 *
 * This is a small, semantic vocabulary for expression constraints. It is NOT a
 * design or layout vocabulary. It constrains HOW the copy is written, not WHAT
 * is decided.
 */
export const ToneConstraint = {
  Professional: 'professional',
  Warm: 'warm',
  Trustworthy: 'trustworthy',
  Inviting: 'inviting',
  Clear: 'clear',
} as const;

/** The union of all valid ToneConstraint values. */
export type ToneConstraintValue =
  (typeof ToneConstraint)[keyof typeof ToneConstraint];

/** Zod schema for a ToneConstraint value. */
export const toneConstraintSchema = z.enum(
  Object.values(ToneConstraint) as [
    ToneConstraintValue,
    ...ToneConstraintValue[],
  ]
);

/**
 * The AI #2 configuration.
 *
 * This is the ONLY configuration AI #2 receives besides the ContentPlan. It
 * constrains expression (tone, language) but MUST NOT add business requirements,
 * capabilities, sections, components, layouts, or design choices.
 */
export interface CopywriterConfig {
  /** The tone/expression constraint for the generated copy. */
  tone: ToneConstraintValue;
  /** The target language code (e.g. 'ko', 'en'). */
  language: string;
}

/** Zod schema for a CopywriterConfig. */
export const copywriterConfigSchema = z.object({
  tone: toneConstraintSchema,
  language: z.string().min(1),
});

/**
 * The AI #2 request.
 *
 * AI #2 receives a ContentPlan (the authoritative instruction boundary) plus a
 * minimal expression configuration. It MUST NOT receive DecisionContext,
 * RecipeBlueprint, ThemeConfig, React components, CSS, or layout definitions.
 */
export interface CopywriterRequest {
  /** The authoritative content instruction boundary. */
  contentPlan: ContentPlan;
  /** The expression configuration (tone, language). */
  config: CopywriterConfig;
}

/** Zod schema for a CopywriterRequest. */
export const copywriterRequestSchema = z.object({
  contentPlan: z.unknown(), // validated structurally by the provider; see note
  config: copywriterConfigSchema,
});

/**
 * The provider-independent AI #2 interface.
 *
 * A future LLM adapter implements this interface. The Brain depends on this
 * interface, NOT on any specific AI vendor.
 *
 * The `generate` method is intentionally synchronous and deterministic in
 * contract: it returns a `GeneratedContentSet`. A real LLM adapter would be
 * async; the interface is kept minimal here. The mock provider is synchronous
 * and deterministic.
 */
export interface CopywriterProvider {
  /** A stable identifier for the provider (e.g. 'mock', 'gemini', 'openai'). */
  readonly name: string;
  /**
   * Generates expression content for the given request.
   *
   * MUST NOT mutate the ContentPlan. MUST NOT invent business facts. MUST NOT
   * add capabilities, sections, components, layouts, or design choices.
   */
  generate(request: CopywriterRequest): GeneratedContentSet;
}

/**
 * A single prompt instruction for a future LLM.
 *
 * The prompt builder translates ContentPlan requirements into instructions. It
 * MUST NOT add new business requirements. It may specify:
 *   - writing objective,
 *   - tone/expression constraints,
 *   - generic-safe constraints,
 *   - allowed evidence references,
 *   - prohibited invention categories,
 *   - requirement identity.
 */
export interface PromptInstruction {
  /** The ContentPlan requirement id this instruction targets. */
  requirementId: string;
  /** The writing objective (from the ContentPlan requirement description). */
  objective: string;
  /** The tone/expression constraint. */
  tone: ToneConstraintValue;
  /** Whether the content must remain generic-safe (no concrete facts). */
  genericSafe: boolean;
  /** The evidence references explicitly permitted (empty when none). */
  allowedEvidenceRefs: string[];
  /** The prohibited invention categories (from mustNotInvent). */
  prohibitedInventions: string[];
}

/** Zod schema for a PromptInstruction. */
export const promptInstructionSchema = z.object({
  requirementId: z.string().min(1),
  objective: z.string().min(1),
  tone: toneConstraintSchema,
  genericSafe: z.boolean(),
  allowedEvidenceRefs: z.array(z.string()),
  prohibitedInventions: z.array(z.string()),
});

/**
 * The prompt contract — the deterministic output of the prompt builder.
 *
 * This is a structured, provider-independent prompt. It is NOT a raw LLM prompt
 * string; it is a contract that a future LLM adapter can render into a vendor
 * prompt. It MUST NOT contain new capabilities, sections, components, layout
 * choices, or design choices.
 */
export interface PromptContract {
  /** A stable identifier for this prompt contract instance. */
  id: string;
  /** The ContentPlan id this prompt derives from. */
  contentPlanId: string;
  /** The target language. */
  language: string;
  /** The global tone constraint. */
  tone: ToneConstraintValue;
  /** The per-requirement instructions. */
  instructions: PromptInstruction[];
}

/** Zod schema for a PromptContract. */
export const promptContractSchema = z.object({
  id: z.string().min(1),
  contentPlanId: z.string().min(1),
  language: z.string().min(1),
  tone: toneConstraintSchema,
  instructions: z.array(promptInstructionSchema),
});

/**
 * The provenance of a generated content item's fact references.
 *
 * This is preserved exactly from the ContentPlan requirement. AI #2 NEVER
 * upgrades provenance (user_asserted → system_verified is forbidden).
 */
export interface GeneratedContentProvenance {
  /** The evidence id. */
  evidenceId: string;
  /** The provenance, preserved exactly. */
  provenance: ProvenanceValue;
}

/** Zod schema for GeneratedContentProvenance. */
export const generatedContentProvenanceSchema = z.object({
  evidenceId: z.string().min(1),
  provenance: z.enum(['user_asserted', 'cms', 'imported', 'system_verified']),
});
