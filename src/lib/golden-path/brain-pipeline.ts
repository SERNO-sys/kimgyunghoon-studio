/**
 * AWIE V2 Brain — Step 14 Production Golden Path Orchestrator.
 *
 * This is the ONLY orchestration layer that wires the already-approved
 * Step 01–13 Brain contracts into the production `/api/ai/autobuild` entry
 * point. It is PURE PLUMBING.
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *   - This module does NOT make business decisions.
 *   - It does NOT select capabilities, layouts, components, or themes.
 *   - It does NOT create Decision Rules.
 *   - It does NOT invent business facts.
 *   - It does NOT modify DecisionPlan, ContentPlan, or RecipeIntegrationResult.
 *   - It does NOT generate ThemeConfig directly.
 *   - It does NOT bypass the Fact Validator or the ThemeConfig Bridge.
 *
 * The orchestrator ONLY:
 *   - calls existing functions/classes,
 *   - passes existing contracts between stages,
 *   - enforces the required ordering,
 *   - stops on validation failure,
 *   - returns a structured pipeline result.
 *
 * PIPELINE ORDER (frozen):
 *   raw prompt
 *     → extractSingleShotBrief()
 *     → BusinessBrief
 *     → BusinessMeaning / DecisionContext
 *     → Decision Rule Engine
 *     → Decision Planner
 *     → DecisionPlan
 *     → Recipe Integration
 *     → ContentPlan
 *     → AI #2 Copywriter
 *     → Fact Validator
 *     → ThemeConfig Bridge
 *     → V2.6 RecipeMerger (execution boundary)
 *
 * STRICT CONSTRAINT: This module MUST NOT contain business logic. It is a thin
 * deterministic adapter over existing contracts. It MUST NOT import React,
 * HTML, CSS, ThemeConfig, or Renderer.
 */

import { extractSingleShotBrief } from '../ai/build/single-shot-brief';
import type { BusinessBrief } from '../question-engine/brief';
import {
  BusinessIntent,
  type BusinessMeaning,
  type BusinessTrait,
} from '../brain/business-meaning';
import type { DecisionContext } from '../brain/decision-context';
import {
  DECISION_RULES,
  SemanticTraitKey,
  type CapabilityCandidate,
} from '../brain/decision-rules';
import { Provenance, type EvidenceSet } from '../brain/evidence';

import { evaluateRules } from '../brain/decision-rule-engine';
import {
  buildDecisionPlan,
  type PlannerInput,
} from '../brain/decision-planner';
import type { DecisionPlan } from '../brain/decision-plan';
import {
  RecipeIntegration,
  type RecipeIntegrationResult,
} from '../brain/recipe-integration';
import { buildContentPlan, type ContentPlan } from '../brain/content-plan';
import {
  MockCopywriterProvider,
  type CopywriterProvider,
  type GeneratedContentSet,
} from '../brain/copywriter';
import { validateFacts, type FactValidationResult } from '../brain/fact-validator';
import { ThemeConfigBridge, type ThemeConfigBridgeResult } from '../brain/theme-config-bridge';
import {
  IndustryResolver,
  GENERIC_PROFILE,
  MOCK_INDUSTRY_PROFILES,
  IndustryRegistry,
  type IndustryProfile,
} from '../industry-registry';
import { RecipeMerger, MOCK_RECIPES, type MergeResult } from '../recipe-engine';
import {
  buildVisualDesignDecision,
  DesignThemeConfigBridge,
  type VisualDesignDecision,
} from '../design-intelligence';


/**
 * The structured failure vocabulary for the Golden Path.
 *
 * These are deterministic, precise reasons why the pipeline stopped. They are
 * NOT a business state machine.
 */
export const GoldenPathErrorCode = {
  /** The raw prompt was empty / whitespace-only. */
  EmptyPrompt: 'EMPTY_PROMPT',
  /** No RecipeBlueprint was compatible with the DecisionPlan. */
  NoCompatibleRecipe: 'NO_COMPATIBLE_RECIPE',
  /** Generated content failed Fact Validation. */
  FactValidationFailed: 'FACT_VALIDATION_FAILED',
  /** The ThemeConfig Bridge could not produce a MergeInput. */
  BridgeFailed: 'BRIDGE_FAILED',
} as const;

/** The union of all valid GoldenPathErrorCode values. */
export type GoldenPathErrorCodeValue =
  (typeof GoldenPathErrorCode)[keyof typeof GoldenPathErrorCode];

/** A structured Golden Path error. */
export interface GoldenPathError {
  /** The error code. */
  code: GoldenPathErrorCodeValue;
  /** A human-readable explanation. */
  message: string;
}

/**
 * The Golden Path result.
 *
 * A discriminated union. On success it carries the V2.6-compatible MergeInput
 * (ready for the existing RecipeMerger), the selected RecipeBlueprint, the
 * resolved base IndustryProfile, and the intermediate Brain outputs for
 * traceability. On failure it carries a structured error.
 */
export type GoldenPathResult =
  | {
      ok: true;
      /** The V2.6-compatible MergeInput (from the ThemeConfig Bridge). */
      mergeInput: import('../recipe-engine').MergeInput;
      /** The selected RecipeBlueprint (HOW assembly). */
      recipe: import('../recipe-engine').RecipeBlueprint;
      /** The resolved base IndustryProfile. */
      baseProfile: import('../industry-registry').IndustryProfile;
      /** The BusinessBrief (Step 13-B boundary output). */
      brief: BusinessBrief;
      /** The BusinessMeaning (WHAT). Never mutated. */
      meaning: BusinessMeaning;
      /** The DecisionPlan (WHAT). Never mutated. */
      plan: DecisionPlan;

      /** The Recipe Integration result. Must be COMPATIBLE. */
      integration: RecipeIntegrationResult;
      /** The ContentPlan (content requirements). Never mutated. */
      contentPlan: ContentPlan;
      /** The AI #2 generated content set. */
      content: GeneratedContentSet;
      /** The Fact Validation result. Must be PASS. */
      factValidation: FactValidationResult;
      /** The ThemeConfig Bridge result. */
      bridge: Extract<ThemeConfigBridgeResult, { ok: true }>;
    }
  | {
      ok: false;
      error: GoldenPathError;
    };

/**
 * The Golden Path orchestrator.
 *
 * Wires the approved Brain contracts in the frozen order. It is deterministic:
 * the same raw prompt always produces the same result. It never mutates the
 * DecisionPlan, ContentPlan, or RecipeIntegrationResult.
 */
export class BrainGoldenPath {
  private readonly recipeIntegration: RecipeIntegration;
  private readonly copywriter: CopywriterProvider;
  private readonly bridge: ThemeConfigBridge;
  private readonly recipeMerger: RecipeMerger;
  private readonly industryResolver: IndustryResolver;

  /**
   * @param copywriter The AI #2 provider. Defaults to the deterministic mock.
   *   The COMPOSITION ROOT (the autobuild route) injects the real Gemini
   *   provider when configured; the Brain itself stays provider-agnostic.
   */
  constructor(copywriter: CopywriterProvider = new MockCopywriterProvider()) {
    // Build the industry registry from the existing design-only mocks.
    const industryRegistry = new IndustryRegistry();
    for (const profile of MOCK_INDUSTRY_PROFILES) {
      industryRegistry.register(profile);
    }
    this.industryResolver = new IndustryResolver(industryRegistry, GENERIC_PROFILE);

    // Recipe Integration composes the HOW contract with the V2.6 RecipeBridge.
    // No HOW profiles are registered, so the HOW layer evaluates as COMPATIBLE
    // and the V2.6 RecipeBridge drives the compatibility verdict.
    this.recipeIntegration = new RecipeIntegration();

    // AI #2 uses the injected provider (mock by default, Gemini in production).
    this.copywriter = copywriter;

    // The ThemeConfig Bridge is the ONLY Brain → V2.6 boundary.
    this.bridge = new ThemeConfigBridge();

    // The V2.6 execution boundary (RecipeMerger) is reused as-is.
    this.recipeMerger = new RecipeMerger();
  }

  /**
   * Runs the full Golden Path for a raw one-line prompt.
   *
   * The first operation on the raw input is ALWAYS `extractSingleShotBrief`.
   * The pipeline stops on any validation failure. It never falls back to a
   * legacy AI decision path.
   *
   * OPTIONAL ENRICHMENT (AWIE V2):
   *   `options.evidence` is an optional list of additional semantic evidence
   *   (e.g. user answers from the enrichment flow). When provided, it is merged
   *   into the BusinessMeaning's evidence and passed to the Decision Planner so
   *   the Decision Engine can re-evaluate capability states (GENERIC → ACTIVE)
   *   based on the newly available scoped evidence. This is a NON-BREAKING
   *   extension: the existing `run(prompt)` call is unchanged and the canonical
   *   one-line generation path is unaffected when no evidence is supplied.
   */
  async run(
    prompt: string,
    options?: { evidence?: EvidenceSet[] }
  ): Promise<GoldenPathResult> {

    // 1. Input boundary: raw prompt → BusinessBrief.
    let brief: BusinessBrief;
    try {
      brief = extractSingleShotBrief(prompt);
    } catch {
      return {
        ok: false,
        error: {
          code: GoldenPathErrorCode.EmptyPrompt,
          message: 'The raw prompt must be a non-empty string.',
        },
      };
    }

    // 2. Resolve the base IndustryProfile from the brief's business type.
    //    This MUST happen BEFORE Semantic Normalization so the resolved
    //    industry can enrich the BusinessMeaning with canonical semantic
    //    traits (see buildMeaning). It also acts as a SAFETY BOUNDARY for
    //    Recipe selection (see step 6).
    //
    //    IMPORTANT: the boundary is only enforced when the input actually
    //    MATCHED a registered industry. When the input is unresolved (falls
    //    back to the generic profile), we do NOT know the industry, so we
    //    preserve the legacy behavior and allow any compatible recipe. This
    //    keeps the golden path working for businesses that are not yet in the
    //    registry while still preventing a known industry (e.g. counseling)
    //    from receiving a recipe scoped to a different industry (e.g.
    //    restaurant).
    const rawBusinessType = brief.businessType?.primary ?? '';
    const baseResolution = this.industryResolver.resolve(rawBusinessType);
    const baseProfile = baseResolution.profile;
    const industryBoundary = baseResolution.matched
      ? baseProfile.industryId
      : undefined;

    // 3. Semantic normalization: BusinessBrief + IndustryProfile → BusinessMeaning.
    const meaning = this.buildMeaning(brief, baseProfile);

    // 4. Decision Rule Engine: BusinessMeaning → Capability candidates.
    const ruleResult = evaluateRules(meaning);
    const candidates = this.reconstructCandidates(ruleResult.firedRuleIds);

    // 5. Decision Planner: candidates → DecisionPlan.
    //
    //    OPTIONAL ENRICHMENT: when additional semantic evidence is supplied
    //    (e.g. user answers from the enrichment flow), it is merged with the
    //    meaning's own evidence and passed to the Decision Planner. This lets
    //    the Decision Engine re-evaluate capability states (GENERIC → ACTIVE)
    //    from the newly available scoped evidence. When no evidence is
    //    supplied, this is exactly the canonical one-line path (evidence = []).
    const plannerEvidence = [
      ...meaning.evidence,
      ...(options?.evidence ?? []),
    ];
    const plannerInput: PlannerInput = {
      meaning,
      evidence: plannerEvidence,
      candidates,
    };
    const plan = buildDecisionPlan(plannerInput);


    // 6. Recipe Integration: DecisionPlan → compatible RecipeBlueprint.
    //    The resolved industry is passed to select() as the safety boundary.
    const integration = this.recipeIntegration.select(
      plan,
      MOCK_RECIPES,
      industryBoundary,
    );

    if (!integration) {
      return {
        ok: false,
        error: {
          code: GoldenPathErrorCode.NoCompatibleRecipe,
          message: 'No registered RecipeBlueprint is compatible with the DecisionPlan.',
        },
      };
    }
    const recipe = MOCK_RECIPES.find((r) => r.recipeId === integration.recipeId);
    if (!recipe) {
      return {
        ok: false,
        error: {
          code: GoldenPathErrorCode.NoCompatibleRecipe,
          message: `Recipe "${integration.recipeId}" was selected but is not registered.`,
        },
      };
    }

    // 7. ContentPlan: DecisionPlan → content requirements for AI #2.
    const contentPlan = buildContentPlan(plan);

    // 8. AI #2: ContentPlan → generated content (expression only).
    const content = await this.copywriter.generate({
      contentPlan,
      config: { tone: 'professional', language: 'ko' },
    });

    // 9. Fact Validator: generated content must PASS before the bridge.
    const factValidation = validateFacts({
      contentPlan,
      items: content.items,
    });
    if (factValidation.status !== 'PASS') {
      return {
        ok: false,
        error: {
          code: GoldenPathErrorCode.FactValidationFailed,
          message: `Generated content failed Fact Validation with ${factValidation.violations.length} violation(s).`,
        },
      };
    }

    // 10. ThemeConfig Bridge: Brain output → V2.6-compatible MergeInput.
    const bridge = this.bridge.build({
      plan,
      contentPlan,
      integration,
      recipe,
      content,
      factValidation,
      brief,
      baseProfile,
    });
    if (!bridge.ok) {
      return {
        ok: false,
        error: {
          code: GoldenPathErrorCode.BridgeFailed,
          message: bridge.error.message,
        },
      };
    }

    return {
      ok: true,
      mergeInput: bridge.mergeInput,
      recipe,
      baseProfile,
      brief,
      meaning,
      plan,
      integration,
      contentPlan,
      content,
      factValidation,
      bridge,
    };

  }

  /**
   * Executes the V2.6 execution boundary (RecipeMerger) against the bridge
   * result, then applies Design Intelligence.
   *
   * This is the final step that produces the V2.6 ThemeConfig. The orchestrator
   * does NOT construct ThemeConfig directly; it only feeds the validated
   * MergeInput to the existing RecipeMerger. After the RecipeMerger produces
   * the ThemeConfig, Design Intelligence (HOW) consumes the Brain outputs and
   * the ThemeConfig Bridge writes the VisualDesignDecision into the
   * renderer-facing ThemeConfig.
   *
   * FLOW:
   *   RecipeMerger → ThemeConfig
   *   Design Intelligence (Brain outputs) → VisualDesignDecision
   *   ThemeConfig Bridge → enriched ThemeConfig
   */
  execute(result: Extract<GoldenPathResult, { ok: true }>): MergeResult {
    // Thread the AI #2 generated content + ContentPlan into the MergeInput so
    // the RecipeMerger can write the generated copy into the semantic sections
    // (Brain Step 08 → ThemeConfig). The bridge's MergeInput carries the
    // recipe/industry/brief; the content is attached here from the pipeline
    // outputs. This is pure plumbing — no business logic.
    const merged = this.recipeMerger.merge({
      ...result.mergeInput,
      content: result.content,
      contentPlan: result.contentPlan,
    });


    // Design Intelligence: consume the Brain outputs (WHAT) and produce the
    // VisualDesignDecision (HOW). This NEVER re-interprets the user's input.
    const decision = buildVisualDesignDecision({
      businessMeaning: result.meaning,
      decisionPlan: result.plan,
      contentPlan: result.contentPlan,
    });

    // ThemeConfig Bridge: write the decision into the renderer-facing config.
    // The selected recipe is passed so the bridge can lift recipe-level CTA
    // copy into the renderer-facing ctaLabel / ctaHref content fields.
    const bridged = new DesignThemeConfigBridge().build({
      decision,
      config: merged.config,
      recipe: result.recipe,
    });


    if (!bridged.ok) {
      return {
        ...merged,
        warnings: [
          ...merged.warnings,
          `Design Intelligence bridge failed: ${bridged.error.message}`,
        ],
      };
    }

    return {
      ...merged,
      config: bridged.config,
      decisions: [
        ...merged.decisions,
        `Design Intelligence applied: ${decision.rationale}`,
      ],
    };
  }


  /**
   * Builds a deterministic BusinessMeaning from the BusinessBrief, enriched by
   * the resolved IndustryProfile.
   *
   * This is a pure mapping of already-known brief slots into the semantic
   * meaning contract, PLUS canonical semantic traits derived from the resolved
   * industry. It NEVER invents facts: unspecified brief slots remain
   * unspecified, and industry traits are only emitted when the profile actually
   * supports them. The primary intent is derived from the brief's primary goal
   * when present, otherwise it defaults to `inform` (the most conservative
   * semantic intent). Explicit user goals remain authoritative — industry
   * intelligence enriches traits but never overrides the resolved intent.
   */
  private buildMeaning(brief: BusinessBrief, profile: IndustryProfile): BusinessMeaning {
    const traits: BusinessTrait[] = [];

    if (brief.businessType?.primary) {
      traits.push({
        key: 'businessType',
        value: brief.businessType.primary,
      });
    }
    if (brief.goals?.primary) {
      traits.push({
        key: 'goal',
        value: brief.goals.primary,
      });
    }
    if (brief.personality?.tone) {
      traits.push({
        key: 'tone',
        value: brief.personality.tone,
      });
    }

    // Enrich with canonical semantic traits derived from the resolved
    // IndustryProfile. These are industry-agnostic SemanticTraitKey signals,
    // never industry IDs or hard-coded industry names.
    this.enrichIndustryTraits(profile, traits);

    const primaryIntent = this.resolveIntent(brief.goals?.primary);

    return {
      id: `meaning-${brief.version}`,
      primaryIntent,
      traits,
      impliedCapabilities: [],
      evidence: [],
    };
  }

  /**
   * Derives canonical semantic traits from a resolved IndustryProfile.
   *
   * This maps generic, industry-agnostic profile signals (capabilities,
   * requirements, constraints, intent) onto the canonical SemanticTraitKey
   * vocabulary. It NEVER branches on industry IDs or hard-coded industry
   * names, so any registered industry benefits. Each derived trait carries
   * evidence with `imported` provenance (system-provided industry knowledge),
   * preserving the provenance distinction without claiming user assertion or
   * system verification. Duplicate SemanticTraitKey values are suppressed.
   */
  private enrichIndustryTraits(profile: IndustryProfile, traits: BusinessTrait[]): void {
    const add = (key: string, claim: string): void => {
      // Avoid duplicate SemanticTraitKey values.
      if (traits.some((t) => t.key === key)) return;
      traits.push({
        key,
        value: 'true',
        evidence: {
          subject: key,
          items: [
            {
              id: `industry.${profile.industryId}.${key}`,
              provenance: Provenance.imported,
              claim,
            },
          ],
        },
      });
    };

    const { capabilities, requirements, constraints, intent } = profile;

    // physical presence
    if (constraints.requiresPhysicalLocation || requirements.requiresAddress) {
      add(
        SemanticTraitKey.physical_presence,
        'The business has a physical presence visitors may need to find.',
      );
    }

    // appointment / booking
    if (capabilities.supportsReservation) {
      add(
        SemanticTraitKey.appointment,
        'The business operates by appointment or scheduled slots.',
      );
    }

    // inquiry / contact
    if (requirements.requiresContactForm || capabilities.supportsConsultationForm) {
      add(
        SemanticTraitKey.inquiry,
        'The business expects customer-initiated contact or questions.',
      );
    }

    // trust
    if (intent.secondary.includes('build_trust') || requirements.requiresTeamProfile) {
      add(
        SemanticTraitKey.trust_requirement,
        'Trust formation is important to the business.',
      );
    }

    // discovery
    if (capabilities.supportsPortfolio || capabilities.supportsMenu) {
      add(
        SemanticTraitKey.discovery_requirement,
        'The business needs visitors to discover its offerings.',
      );
    }

    // lead generation
    if (intent.primary === 'attract_clients' || intent.primary === 'convert') {
      add(
        SemanticTraitKey.lead_generation,
        'The business captures leads for follow-up.',
      );
    }

    // transaction
    if (capabilities.supportsOnlineOrdering) {
      add(
        SemanticTraitKey.transaction,
        'The business sells a product or service for money.',
      );
    }
  }

  /**
   * Resolves the primary semantic intent from the brief's primary goal.
   *
   * This is a deterministic, conservative mapping. Unknown goals map to
   * `inform` (the least presumptive intent). It never fabricates a goal.
   */
  private resolveIntent(goal: string | undefined): BusinessMeaning['primaryIntent'] {
    if (!goal) return BusinessIntent.inform;
    const g = goal.toLowerCase();
    if (g.includes('order') || g.includes('purchase') || g.includes('sell')) {
      return BusinessIntent.transact;
    }
    if (g.includes('book') || g.includes('reserve') || g.includes('schedule')) {
      return BusinessIntent.book;
    }
    if (g.includes('lead') || g.includes('contact') || g.includes('convert')) {
      return BusinessIntent.convert;
    }
    if (g.includes('showcase') || g.includes('portfolio') || g.includes('display')) {
      return BusinessIntent.showcase;
    }
    if (g.includes('trust') || g.includes('credib')) {
      return BusinessIntent.establish_trust;
    }
    return BusinessIntent.inform;
  }

  /**
   * Reconstructs the CapabilityCandidate[] from the fired rule IDs.
   *
   * The Decision Rule Engine's public `evaluateRules` returns merged
   * CapabilityDecision[] (which strips priority/role), but the Decision Planner
   * requires CapabilityCandidate[] (with priority/role). This reconstructs the
   * candidates from the SAME approved rule set, filtered by the exact fired
   * rule IDs the engine reported. It does NOT create rules or make decisions.
   */
  private reconstructCandidates(firedRuleIds: string[]): CapabilityCandidate[] {
    const fired = new Set(firedRuleIds);
    const candidates: CapabilityCandidate[] = [];
    for (const rule of DECISION_RULES) {
      if (fired.has(rule.id)) {
        candidates.push(rule.result);
      }
    }
    return candidates;
  }
}
