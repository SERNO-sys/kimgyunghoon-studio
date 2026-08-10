/**
 * AWIE V2 Brain — ThemeConfig Bridge (Step 12).
 *
 * The ThemeConfig Bridge is the ONLY boundary that connects the Brain's
 * semantic output (DecisionPlan + ContentPlan + validated generated content)
 * to the existing V2.6 Recipe/Build execution pipeline (RecipeMerger →
 * ThemeConfig).
 *
 * PIPELINE POSITION (Architecture Brain Freeze v1.0):
 *
 *   DecisionPlan
 *     ↓
 *   ContentPlan
 *     ↓
 *   AI #2
 *     ↓
 *   Fact Validator
 *     ↓
 *   ThemeConfig Bridge        ← THIS STEP (adapter only)
 *     ↓
 *   V2.6 RecipeMerger
 *     ↓
 *   ThemeConfig
 *     ↓
 *   Renderer
 *
 * CORE RESPONSIBILITY:
 *   The Bridge translates the Brain's semantic capability states into the
 *   legacy boolean capability representation the existing V2.6 RecipeMerger
 *   consumes. It is a pure ADAPTER. It does NOT:
 *     - decide which capabilities exist,
 *     - decide capability states,
 *     - select a recipe,
 *     - change a capability state,
 *     - resurrect a DROP capability,
 *     - activate a DORMANT capability,
 *     - fabricate evidence or concrete records,
 *     - infer a capability from a legacy key,
 *     - become a hidden Decision Engine.
 *
 * STATE MAPPING (the only translation this module performs):
 *   ACTIVE  → legacy capability enabled (true)
 *   GENERIC → legacy capability enabled (true)  [content stays generic-safe]
 *   DORMANT → legacy capability disabled (false / omitted)
 *   DROP    → legacy capability disabled (false / omitted)
 *
 *   DORMANT and DROP are NEVER enabled. This is the deterministic guarantee
 *   that prevents the V2.6 RecipeMerger from rendering dormant/dropped
 *   capabilities as active content.
 *
 * ADAPTER VOCABULARY:
 *   The V2.6 IndustryProfile uses legacy capability keys (e.g. supportsMenu,
 *   requiresContactForm). The Brain uses semantic CapabilityIds (e.g.
 *   discovery, inquiry). The Bridge carries a DECLARATIVE, fixed mapping from
 *   each Brain CapabilityId to the legacy keys it semantically corresponds to.
 *   This is a translation dictionary, NOT a business decision. It is grounded
 *   in the existing V2.6 IndustryProfile capability keys.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain business logic. It MUST NOT
 * import React, HTML, CSS, ThemeConfig, or Renderer. It MUST NOT mutate the
 * DecisionPlan, ContentPlan, or generated content. It MUST NOT generate or
 * rewrite content. It MUST NOT infer new business facts.
 */

import type { DecisionPlan } from './decision-plan';
import type { CapabilityId, CapabilityStateValue } from './capability';
import type { ContentPlan } from './content-plan';
import type { RecipeIntegrationResult } from './recipe-integration';
import type { GeneratedContentSet } from './copywriter';
import type { FactValidationResult } from './fact-validator';
import type { BusinessBrief } from '../question-engine/brief';
import type { IndustryProfile } from '../industry-registry';
import type {
  MergeInput,
  RecipeBlueprint,
  UserPreferences,
} from '../recipe-engine';

/**
 * The declarative adapter vocabulary: Brain CapabilityId → legacy
 * IndustryProfile capability keys.
 *
 * This is a FIXED translation dictionary. It is NOT a business decision and it
 * is NOT inferred at runtime. It is grounded in the existing V2.6
 * IndustryProfile capability keys (supportsMenu, supportsReservation,
 * supportsOnlineOrdering, supportsConsultationForm, supportsPortfolio,
 * requiresAddress, requiresOpeningHours, requiresContactForm,
 * requiresDisclaimer, requiresTeamProfile).
 *
 * A Brain capability may correspond to more than one legacy key. Every legacy
 * key listed here is enabled when the Brain capability is ACTIVE or GENERIC,
 * and disabled when it is DORMANT or DROP.
 */
export const CAPABILITY_TO_LEGACY_KEYS: Record<
  CapabilityId,
  readonly string[]
> = {
  /** Users discover offerings — menu / portfolio / online ordering. */
  discovery: ['supportsMenu', 'supportsPortfolio'],
  /** Users purchase — online ordering / commerce. */
  purchase: ['supportsOnlineOrdering'],
  /** Users book — reservation. */
  booking: ['supportsReservation'],
  /** Users inquire — contact form. */
  inquiry: ['requiresContactForm'],
  /** Business captures leads — consultation form. */
  lead_capture: ['supportsConsultationForm'],
  /** Physical location matters — address. */
  location: ['requiresAddress'],
  /** Trust formation — team profile / portfolio. */
  trust: ['requiresTeamProfile'],
};

/**
 * The ThemeConfig Bridge input.
 *
 * This is the complete, coherent set of Brain outputs plus the existing V2.6
 * inputs the RecipeMerger genuinely requires. The Bridge does NOT derive any
 * of these from the others; it only translates the capability states.
 */
export interface ThemeConfigBridgeInput {
  /** The DecisionPlan (WHAT). Never mutated. */
  plan: DecisionPlan;
  /** The ContentPlan (content requirements). Never mutated. */
  contentPlan: ContentPlan;
  /** The Recipe Integration result (Step 08). Must be COMPATIBLE. */
  integration: RecipeIntegrationResult;
  /** The selected RecipeBlueprint (HOW assembly). */
  recipe: RecipeBlueprint;
  /** The validated generated content set (AI #2 output). */
  content: GeneratedContentSet;
  /** The Fact Validation result. Must be PASS. */
  factValidation: FactValidationResult;
  /** The existing BusinessBrief (from the Question Engine). */
  brief: BusinessBrief;
  /** The resolved legacy IndustryProfile (base for the adapter). */
  baseProfile: IndustryProfile;
  /** Existing V2.6 user preferences (highest priority), when present. */
  userPreferences?: UserPreferences;
}

/**
 * The ThemeConfig Bridge error vocabulary.
 *
 * These are structured, deterministic failure reasons. They are NOT a business
 * state machine — they are precise reasons why the Bridge cannot produce a
 * valid MergeInput.
 */
export const ThemeConfigBridgeErrorCode = {
  /** The Recipe Integration verdict is INCOMPATIBLE. */
  IncompatibleRecipe: 'INCOMPATIBLE_RECIPE',
  /** The Fact Validation status is FAIL. */
  FactValidationFailed: 'FACT_VALIDATION_FAILED',
  /** No RecipeBlueprint was provided. */
  MissingRecipe: 'MISSING_RECIPE',
  /** No base IndustryProfile was provided. */
  MissingBaseProfile: 'MISSING_BASE_PROFILE',
  /** A Brain capability has no legacy mapping (should not happen with the canonical vocabulary). */
  UnknownCapability: 'UNKNOWN_CAPABILITY',
} as const;

/** The union of all valid ThemeConfigBridgeErrorCode values. */
export type ThemeConfigBridgeErrorCodeValue =
  (typeof ThemeConfigBridgeErrorCode)[keyof typeof ThemeConfigBridgeErrorCode];

/** A structured Bridge error. */
export interface ThemeConfigBridgeError {
  /** The error code. */
  code: ThemeConfigBridgeErrorCodeValue;
  /** A human-readable explanation. */
  message: string;
}

/**
 * The ThemeConfig Bridge result.
 *
 * A discriminated union. On success it carries the MergeInput ready for the
 * existing V2.6 RecipeMerger, the adapter IndustryProfile, and the lists of
 * Brain capabilities that were enabled / disabled in the adapter. On failure
 * it carries a structured error.
 */
export type ThemeConfigBridgeResult =
  | {
      ok: true;
      /** The MergeInput for the existing V2.6 RecipeMerger. */
      mergeInput: MergeInput;
      /** The adapter IndustryProfile (legacy representation). */
      adapterProfile: IndustryProfile;
      /** Brain capabilities enabled in the adapter (ACTIVE / GENERIC). */
      enabledCapabilities: CapabilityId[];
      /** Brain capabilities disabled in the adapter (DORMANT / DROP). */
      disabledCapabilities: CapabilityId[];
    }
  | {
      ok: false;
      error: ThemeConfigBridgeError;
    };

/**
 * The ThemeConfig Bridge.
 *
 * Translates the Brain's semantic capability states into the legacy boolean
 * capability representation the existing V2.6 RecipeMerger consumes. It is
 * deterministic: the same input always produces the same result. It never
 * mutates the DecisionPlan, ContentPlan, or generated content.
 */
export class ThemeConfigBridge {
  /**
   * Builds a valid MergeInput for the existing V2.6 RecipeMerger.
   *
   * Coherence checks (deterministic, no business logic):
   *   1. A RecipeBlueprint must be provided.
   *   2. A base IndustryProfile must be provided.
   *   3. The Recipe Integration verdict must be COMPATIBLE.
   *   4. The Fact Validation status must be PASS.
   *
   * Then it builds an adapter IndustryProfile whose capability booleans are
   * recomputed from the Brain DecisionPlan states:
   *   ACTIVE / GENERIC → enabled (true)
   *   DORMANT / DROP   → disabled (false)
   *
   * All non-capability fields of the base profile (industryId, aliases,
   * intent, constraints, validationProfile, confidenceHints, metadata) are
   * preserved unchanged. The original DecisionPlan is never mutated.
   */
  build(input: ThemeConfigBridgeInput): ThemeConfigBridgeResult {
    // 1. Recipe presence.
    if (!input.recipe) {
      return {
        ok: false,
        error: {
          code: ThemeConfigBridgeErrorCode.MissingRecipe,
          message:
            'A RecipeBlueprint is required to build a MergeInput for the V2.6 RecipeMerger.',
        },
      };
    }

    // 2. Base profile presence.
    if (!input.baseProfile) {
      return {
        ok: false,
        error: {
          code: ThemeConfigBridgeErrorCode.MissingBaseProfile,
          message:
            'A base IndustryProfile is required to construct the adapter profile for the V2.6 RecipeMerger.',
        },
      };
    }

    // 3. Recipe Integration verdict.
    if (input.integration.verdict !== 'COMPATIBLE') {
      return {
        ok: false,
        error: {
          code: ThemeConfigBridgeErrorCode.IncompatibleRecipe,
          message: `Recipe "${input.integration.recipeId}" is INCOMPATIBLE with the DecisionPlan: ${input.integration.reasons.join('; ')}`,
        },
      };
    }

    // 4. Fact Validation status.
    if (input.factValidation.status !== 'PASS') {
      return {
        ok: false,
        error: {
          code: ThemeConfigBridgeErrorCode.FactValidationFailed,
          message: `Generated content failed Fact Validation with ${input.factValidation.violations.length} violation(s); it must not be rendered.`,
        },
      };
    }

    // Build the adapter profile from the Brain capability states.
    const adapter = this.buildAdapterProfile(input);

    if (!adapter.ok) {
      return { ok: false, error: adapter.error };
    }

    const mergeInput: MergeInput = {
      recipe: input.recipe,
      industryProfile: adapter.adapterProfile,
      brief: input.brief,
      userPreferences: input.userPreferences,
    };

    return {
      ok: true,
      mergeInput,
      adapterProfile: adapter.adapterProfile,
      enabledCapabilities: adapter.enabledCapabilities,
      disabledCapabilities: adapter.disabledCapabilities,
    };
  }

  /**
   * Builds the adapter IndustryProfile.
   *
   * Starts from the base profile and recomputes the capability booleans from
   * the Brain DecisionPlan states. ACTIVE / GENERIC enable their mapped legacy
   * keys; DORMANT / DROP disable them. All other base profile fields are
   * preserved unchanged.
   */
  private buildAdapterProfile(
    input: ThemeConfigBridgeInput,
  ):
    | {
        ok: true;
        adapterProfile: IndustryProfile;
        enabledCapabilities: CapabilityId[];
        disabledCapabilities: CapabilityId[];
      }
    | { ok: false; error: ThemeConfigBridgeError } {
    const capabilities: Record<string, boolean | undefined> = {
      ...input.baseProfile.capabilities,
    };
    const requirements: Record<string, boolean | undefined> = {
      ...input.baseProfile.requirements,
    };

    const enabledCapabilities: CapabilityId[] = [];
    const disabledCapabilities: CapabilityId[] = [];

    for (const planned of input.plan.capabilities) {
      const legacyKeys = CAPABILITY_TO_LEGACY_KEYS[planned.capability];
      if (!legacyKeys) {
        return {
          ok: false,
          error: {
            code: ThemeConfigBridgeErrorCode.UnknownCapability,
            message: `Brain capability "${planned.capability}" has no legacy mapping in the adapter vocabulary.`,
          },
        };
      }

      const enabled = this.isEnabled(planned.state);
      for (const key of legacyKeys) {
        // Capability keys live in `capabilities`; requirement keys live in
        // `requirements`. The adapter writes to whichever bucket the base
        // profile already uses, defaulting to `capabilities`.
        if (key in requirements) {
          requirements[key] = enabled;
        } else {
          capabilities[key] = enabled;
        }
      }

      if (enabled) {
        enabledCapabilities.push(planned.capability);
      } else {
        disabledCapabilities.push(planned.capability);
      }
    }

    const adapterProfile: IndustryProfile = {
      ...input.baseProfile,
      capabilities,
      requirements,
    };

    return {
      ok: true,
      adapterProfile,
      enabledCapabilities,
      disabledCapabilities,
    };
  }

  /**
   * Whether a capability state maps to an enabled legacy capability.
   *
   * ACTIVE and GENERIC are enabled. DORMANT and DROP are never enabled. This
   * is the deterministic guarantee that prevents dormant/dropped capabilities
   * from being rendered as active content.
   */
  private isEnabled(state: CapabilityStateValue): boolean {
    return state === 'ACTIVE' || state === 'GENERIC';
  }
}
