/**
 * AWIE V2 Brain — AI #2 deterministic prompt builder (Step 11).
 *
 * The prompt builder translates ContentPlan requirements into a structured,
 * provider-independent PromptContract for a future LLM adapter.
 *
 * DETERMINISTIC PROGRAM BOUNDARY:
 *   Same ContentPlan + same configuration = same PromptContract output.
 *   No randomness. No LLM call.
 *
 * The prompt builder MUST NOT add new business requirements. It may specify:
 *   - writing objective,
 *   - tone/expression constraints,
 *   - generic-safe constraints,
 *   - allowed evidence references,
 *   - prohibited invention categories,
 *   - requirement identity.
 *
 * It MUST NOT specify:
 *   - new capabilities,
 *   - new sections,
 *   - new components,
 *   - layout choices,
 *   - design choices.
 *
 * STRICT CONSTRAINT: This module MUST NOT import React, HTML, CSS, ThemeConfig,
 * Renderer, or any UI concept. It MUST NOT modify ContentPlan.
 */

import type { ContentPlan, ContentPlanRequirement } from '../content-plan';
import type {
  CopywriterConfig,
  PromptContract,
  PromptInstruction,
} from './types';

/**
 * Builds a deterministic PromptContract from a ContentPlan and configuration.
 *
 * This is a pure, side-effect-free translation. It NEVER:
 *   - adds capabilities, sections, components, layouts, or design choices,
 *   - invents business facts,
 *   - upgrades provenance,
 *   - calls an LLM,
 *   - mutates the ContentPlan.
 *
 * The same ContentPlan + same config always produces the same PromptContract.
 */
export function buildPromptContract(
  contentPlan: ContentPlan,
  config: CopywriterConfig
): PromptContract {
  const instructions: PromptInstruction[] = [];

  for (const requirement of contentPlan.requirements) {
    instructions.push(buildInstruction(requirement, config));
  }

  return {
    id: `prompt-${contentPlan.id}`,
    contentPlanId: contentPlan.id,
    language: config.language,
    tone: config.tone,
    instructions,
  };
}

/**
 * Builds a single PromptInstruction from a ContentPlan requirement.
 *
 * The instruction is derived deterministically from the requirement's own
 * contract data. It NEVER adds new business requirements.
 *
 * Generic-safe determination:
 *   A requirement is generic-safe when its `factAvailability` is `generic_safe`
 *   OR `unavailable`. In both cases concrete facts are NOT available, so the
 *   instruction must constrain the LLM to generic-safe language.
 *
 * Allowed evidence references:
 *   Only the requirement's own `evidenceRefs` are permitted. When
 *   `factAvailability` is `generic_safe` or `unavailable`, the requirement
 *   carries no permitted references (the ContentPlan already stripped them), so
 *   the instruction's allowed set is empty — the LLM may not attach any fact.
 */
export function buildInstruction(
  requirement: ContentPlanRequirement,
  config: CopywriterConfig
): PromptInstruction {
  const genericSafe =
    requirement.factAvailability === 'generic_safe' ||
    requirement.factAvailability === 'unavailable';

  return {
    requirementId: requirement.id,
    objective: requirement.description,
    shape: requirement.shape,
    fields: [...requirement.fields],
    tone: config.tone,
    genericSafe,
    allowedEvidenceRefs: genericSafe ? [] : [...requirement.evidenceRefs],
    prohibitedInventions: [...requirement.mustNotInvent],
  };
}


