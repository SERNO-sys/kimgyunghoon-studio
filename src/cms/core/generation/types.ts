/**
 * AWIE V2 - Phase 14 Step 5: CMS Infrastructure - AI Native Generation Interfaces.
 *
 * This module defines the STRICT boundary interfaces for the AI Generation
 * Layer. It is INTERFACE ONLY. It contains NO concrete implementation classes
 * (e.g. OpenAI API clients).
 *
 * ============================================================================
 * THE ABSOLUTE BOUNDARY: AI IS A WRITER, NOT A COMPOSER
 * ============================================================================
 * 1. AI MUST NEVER generate a ThemeConfig.
 *
 *    The ThemeConfig is the immutable execution contract. It is produced
 *    EXCLUSIVELY by the CompositionService (DefaultCompositionService). The AI
 *    MUST NEVER bypass the CompositionService and MUST NEVER emit a ThemeConfig
 *    directly. If the AI were allowed to touch the execution contract, the
 *    DefaultCompositionService would become meaningless and hallucinations
 *    would directly corrupt the Runtime.
 *
 * 2. AI Generates Write Models.
 *
 *    The AI is strictly a content generation system (a CMS Writer). It takes a
 *    GenerationRequest (e.g. a Business Brief, prompts) and outputs CMS Write
 *    Models (e.g. DraftLocalizationRecord, DraftPresentationRecord). These are
 *    passive, draft-level data carriers that the CMS may later persist and
 *    compose.
 *
 * 3. AI Blindness.
 *
 *    The AI layer MUST NOT invoke Readers. It MUST NOT know about Project,
 *    Brand, Locale, or Plugin structures beyond what is provided in its text
 *    generation context. The AI is a "most intelligent data typist" — it
 *    receives prompts and emits pure write-model data.
 *
 * 4. Interface Only.
 *
 *    This module defines pure interfaces. Concrete implementation classes
 *    (e.g. OpenAI API clients) are defined separately and are NOT part of this
 *    module.
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// GenerationRequest (DTO)
// ---------------------------------------------------------------------------

/**
 * The generation context/prompts for an AI generation request.
 *
 * This is a passive DTO. It carries the text generation context (e.g. a
 * Business Brief, prompts, target locale) that the AI consumes. It does NOT
 * carry CMS Aggregate Roots (Project, Brand, LocaleVariant, PluginSet, etc.).
 *
 * STRICT RULES:
 * - Contains ONLY generation context/prompts. No CMS models are passed.
 * - The AI MUST NOT know about Project, Brand, Locale, or Plugin structures
 *   beyond what is provided here as text context.
 * - The DTO is immutable (readonly).
 */
export interface GenerationRequest {
  /** The stable project id this generation is scoped to. */
  readonly projectId: string;
  /** The target locale for the generated content (e.g. "ko-KR"). */
  readonly locale: string;
  /** The generation context/prompts (e.g. a Business Brief). */
  readonly context: string;
  /** Optional structured prompt hints for the AI. */
  readonly prompts?: ReadonlyArray<string>;
}

// ---------------------------------------------------------------------------
// GeneratedCMSModel (CMS Write Models)
// ---------------------------------------------------------------------------

/**
 * A draft localization write model produced by the AI.
 *
 * This is a passive, draft-level data carrier. It represents AI-generated
 * locale content that the CMS may later persist and compose. It is NOT a
 * ThemeConfig and MUST NEVER be treated as one.
 */
export interface DraftLocalizationRecord {
  /** The kind discriminator for this write model. */
  readonly kind: 'localization';
  /** The target locale for this draft content. */
  readonly locale: string;
  /** The AI-generated content payload (raw, uninterpreted). */
  readonly content: unknown;
}

/**
 * A draft presentation write model produced by the AI.
 *
 * This is a passive, draft-level data carrier. It represents AI-generated
 * visual/design asset data that the CMS may later persist and compose. It is
 * NOT a ThemeConfig and MUST NEVER be treated as one.
 */
export interface DraftPresentationRecord {
  /** The kind discriminator for this write model. */
  readonly kind: 'presentation';
  /** The AI-generated visual/design asset payload (raw, uninterpreted). */
  readonly asset: unknown;
}

/**
 * A draft structural write model produced by the AI.
 *
 * This is a passive, draft-level data carrier. It represents AI-generated
 * structural blueprint data that the CMS may later persist and compose. It is
 * NOT a ThemeConfig and MUST NEVER be treated as one.
 */
export interface DraftStructureRecord {
  /** The kind discriminator for this write model. */
  readonly kind: 'structure';
  /** The AI-generated structural blueprint payload (raw, uninterpreted). */
  readonly blueprint: unknown;
}

/**
 * The generic union of CMS Write Models that the AI is permitted to output.
 *
 * STRICT RULE: This union is STRICTLY limited to CMS Write Models. It MUST
 * NEVER include a ThemeConfig. The AI is a Writer, NOT a Composer.
 */
export type GeneratedCMSModel =
  | DraftLocalizationRecord
  | DraftPresentationRecord
  | DraftStructureRecord;

// ---------------------------------------------------------------------------
// IGenerationService (SINGLE CONTRACT)
// ---------------------------------------------------------------------------

/**
 * The AI Generation Service boundary.
 *
 * The AI is strictly a content generation system (a CMS Writer). It takes a
 * GenerationRequest and outputs CMS Write Models.
 *
 * STRICT RULES:
 * - EXACTLY ONE method: generate(request): Promise<GeneratedCMSModel>.
 * - The output is STRICTLY a CMS Write Model (GeneratedCMSModel). It is NEVER
 *   a ThemeConfig.
 * - The AI MUST NEVER bypass the CompositionService. The CompositionService
 *   remains the EXCLUSIVE producer of ThemeConfig.
 * - The AI layer MUST NOT invoke Readers. It MUST NOT know about Project,
 *   Brand, Locale, or Plugin structures beyond what is provided in its text
 *   generation context.
 */
export interface IGenerationService {
  /**
   * Generates a CMS Write Model from a generation request.
   *
   * @param request - The generation context/prompts (e.g. a Business Brief).
   * @returns A Promise resolving to a CMS Write Model (NEVER a ThemeConfig).
   */
  generate(request: GenerationRequest): Promise<GeneratedCMSModel>;
}
