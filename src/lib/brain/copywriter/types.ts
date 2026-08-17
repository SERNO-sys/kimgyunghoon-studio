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
import {
  ContentShape,
  contentShapeSchema,
  type ContentShapeValue,
} from '../content-plan';
import type { ContentPlan } from '../content-plan';
import type { Evidence, EvidenceSet, ProvenanceValue } from '../evidence';


// Re-export the canonical semantic content-shape vocabulary.
//
// `content-plan.ts` is the SINGLE canonical owner of the semantic content-shape
// vocabulary (ContentShape / ContentShapeValue / contentShapeSchema). The
// copywriter contract re-exports it so consumers of the copywriter public API
// keep a stable surface WITHOUT duplicating the vocabulary. Duplicating it here
// would create an ambiguous re-export (TS2308) when both modules are re-exported
// from the brain barrel.
export { ContentShape, contentShapeSchema };
export type { ContentShapeValue };


/**
 * The structured semantic fields of a generated content item.
 *
 * These are the exact semantic fields the model fills for a requirement's shape.
 * They are SEMANTIC — they are NOT renderer / ThemeConfig / layout vocabulary.
 * The RecipeMerger maps these fields into ThemeConfig section content.
 */
export interface GeneratedContentFields {
  /** A headline (hero / text shapes). */
  headline?: string;
  /** A subheadline (hero shape). */
  subheadline?: string;
  /** A title (text / list / grid / contact shapes). */
  title?: string;
  /** A body paragraph (text / contact shapes). */
  body?: string;
  /** A call-to-action label (hero / contact shapes). */
  cta?: string;
  /** A list of items (list / grid shapes). */
  items?: Array<{
    /** The item name (list / grid shapes). */
    name: string;
    /** A short description (list shape). */
    description?: string;
    /** A role (grid shape). */
    role?: string;
    /** A short bio (grid shape). */
    bio?: string;
  }>;
}

/** Zod schema for GeneratedContentFields. */
export const generatedContentFieldsSchema = z.object({
  headline: z.string().optional(),
  subheadline: z.string().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  cta: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        role: z.string().optional(),
        bio: z.string().optional(),
      })
    )
    .optional(),
});

/**
 * A single RAW LLM output item.
 *
 * This is the AI-owned semantic content ONLY. It deliberately does NOT carry
 * `id`, `requirementId`, `shape`, or `factReferences` — those are SYSTEM-OWNED
 * identifiers that the program already knows from the ContentPlan and MUST NOT
 * be invented by the model. The provider injects them during normalization.
 */
export interface LLMGeneratedContent {
  /** The structured semantic fields the model filled for this item. */
  fields: GeneratedContentFields;
}

/** Zod schema for a RAW LLM output item. */
export const llmGeneratedContentSchema = z.object({
  fields: generatedContentFieldsSchema,
});

/**
 * The RAW LLM output — the AI-owned semantic content set.
 *
 * This is the schema `generateStructured()` validates the model output against.
 * It contains ONLY AI-owned semantic content (`items[].fields`). It does NOT
 * require the system-owned identifiers (`id`, `contentPlanId`, `requirementId`,
 * `shape`, `factReferences`) because the model must not invent them. The
 * provider assembles the final `GeneratedContentSet` from this raw output plus
 * the authoritative ContentPlan.
 */
export interface LLMGeneratedContentSet {
  /** The AI-owned semantic content items, in ContentPlan requirement order. */
  items: LLMGeneratedContent[];
}

/** Zod schema for the RAW LLM output. */
export const llmGeneratedContentSetSchema = z.object({
  items: z.array(llmGeneratedContentSchema),
});


/**
 * A single generated content item produced by AI #2.
 *
 * This is the OUTPUT contract. It is intentionally structurally compatible with
 * the Fact Validator's `GeneratedContentItem` so that AI #2 output can be passed
 * directly to the Fact Validator without transformation.
 *
 * Each item MUST identify the ContentPlan requirement it satisfies
 * (`requirementId`). It carries NO UI / layout / component / theme information.
 *
 * STRUCTURED OUTPUT:
 *   Each item carries the semantic `shape` and the structured `fields` the model
 *   filled for that shape (matching the ContentPlan requirement's shape/fields).
 *   `body` is retained as a flattened text representation of the fields so the
 *   Fact Validator's text-based checks and any legacy consumers keep working.
 */
export interface GeneratedContent {
  /** A stable identifier for this generated content item. */
  id: string;
  /** The ContentPlan requirement id this content satisfies. */
  requirementId: string;
  /**
   * The semantic content SHAPE of this generated item.
   *
   * This is SEMANTIC structure (hero/text/list/grid/contact), NOT a UI section
   * name, renderer variant, or ThemeConfig field.
   */
  shape: ContentShapeValue;
  /**
   * The structured semantic fields the model filled for this item's shape.
   *
   * These are SEMANTIC fields (headline, subheadline, title, body, cta, items).
   * They are NOT renderer / ThemeConfig / layout vocabulary.
   */
  fields: GeneratedContentFields;
  /**
   * The generated content body (expression/text only).
   *
   * This is a flattened text representation of the structured `fields`. It is
   * retained for backward compatibility with the Fact Validator's text-based
   * checks and any legacy consumers.
   */
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
  shape: contentShapeSchema,
  fields: generatedContentFieldsSchema,
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
  /**
   * The evidence available to the expression layer.
   *
   * This is the SAME evidence the Decision Planner already consumed to build the
   * ContentPlan. It is passed so the provider can render the concrete facts that
   * the ContentPlan explicitly permits (via each requirement's `evidenceRefs`)
   * into the LLM prompt. It is NOT a new decision input: the ContentPlan remains
   * the authoritative instruction boundary, and only the evidence ids listed in
   * a requirement's `evidenceRefs` may be surfaced for that requirement.
   *
   * When omitted, the provider renders no evidence context (equivalent to the
   * canonical one-line path where evidence = []).
   */
  evidence?: EvidenceSet[];
}

/** Zod schema for a CopywriterRequest. */
export const copywriterRequestSchema = z.object({
  contentPlan: z.unknown(), // validated structurally by the provider; see note
  config: copywriterConfigSchema,
  evidence: z.array(z.unknown()).optional(),
});


/**
 * The provider-independent AI #2 interface.
 *
 * A future LLM adapter implements this interface. The Brain depends on this
 * interface, NOT on any specific AI vendor.
 *
 * The `generate` method is async so that a real LLM adapter (e.g. Gemini) can
 * await an external API call. The mock provider remains deterministic and
 * simply resolves with its precomputed output.
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
  generate(request: CopywriterRequest): Promise<GeneratedContentSet>;
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
  /**
   * The semantic content SHAPE the model must produce for this requirement.
   *
   * This is SEMANTIC structure (hero/text/list/grid/contact), NOT a UI section
   * name, renderer variant, or ThemeConfig field. It tells the model which
   * semantic fields to fill so it generates real structured copy.
   */
  shape: string;
  /**
   * The exact semantic fields the model must fill for this requirement.
   *
   * Derived deterministically from the ContentPlan requirement's `shape`. It is
   * the field vocabulary the model must fill. It MUST NOT expose renderer /
   * ThemeConfig / layout vocabulary.
   */
  fields: string[];
  /** The tone/expression constraint. */
  tone: ToneConstraintValue;
  /** Whether the content must remain generic-safe (no concrete facts). */
  genericSafe: boolean;
  /** The evidence references explicitly permitted (empty when none). */
  allowedEvidenceRefs: string[];
  /** The prohibited invention categories (from mustNotInvent). */
  prohibitedInventions: string[];
  /**
   * The concrete evidence context the model may use for this requirement.
   *
   * This is the serialized text of ONLY the evidence items whose ids appear in
   * `allowedEvidenceRefs`. It is derived deterministically from the request's
   * `evidence` and the requirement's permitted refs. When the requirement is
   * generic-safe (no permitted refs) or no evidence was supplied, this is empty
   * and the model must write generic-safe copy.
   */
  evidenceContext: string[];
}

/** Zod schema for a PromptInstruction. */
export const promptInstructionSchema = z.object({
  requirementId: z.string().min(1),
  objective: z.string().min(1),
  shape: z.string().min(1),
  fields: z.array(z.string()),
  tone: toneConstraintSchema,
  genericSafe: z.boolean(),
  allowedEvidenceRefs: z.array(z.string()),
  prohibitedInventions: z.array(z.string()),
  evidenceContext: z.array(z.string()),
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
