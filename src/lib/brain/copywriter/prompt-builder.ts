/**
 * AWIE V2 Brain — AI #2 deterministic prompt builder (Step 11).
 *
 * The prompt builder translates ContentPlan requirements into a structured,
 * provider-independent PromptContract for a future LLM adapter.
 *
 * DETERMINISTIC PROGRAM BOUNDARY:
 *   Same ContentPlan + same configuration + same evidence = same PromptContract
 *   output. No randomness. No LLM call.
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
 * EVIDENCE BOUNDARY:
 *   The builder may surface concrete evidence ONLY for the evidence ids that a
 *   requirement explicitly permits via its `evidenceRefs`. It serializes those
 *   permitted items into `evidenceContext` so a provider can render them into
 *   the LLM prompt. It NEVER invents facts and NEVER surfaces evidence that the
 *   ContentPlan did not permit.
 *
 * STRICT CONSTRAINT: This module MUST NOT import React, HTML, CSS, ThemeConfig,
 * Renderer, or any UI concept. It MUST NOT modify ContentPlan.
 */

import type { ContentPlan, ContentPlanRequirement } from '../content-plan';
import type { Evidence, EvidenceSet } from '../evidence';
import type {
  CopywriterConfig,
  PromptContract,
  PromptInstruction,
} from './types';

/**
 * Builds a deterministic PromptContract from a ContentPlan, configuration, and
 * the evidence available to the expression layer.
 *
 * This is a pure, side-effect-free translation. It NEVER:
 *   - adds capabilities, sections, components, layouts, or design choices,
 *   - invents business facts,
 *   - upgrades provenance,
 *   - calls an LLM,
 *   - mutates the ContentPlan.
 *
 * The same ContentPlan + same config + same evidence always produces the same
 * PromptContract.
 *
 * @param contentPlan The authoritative content instruction boundary.
 * @param config The expression configuration (tone, language).
 * @param evidence The evidence available to the expression layer. Only the
 *   evidence ids a requirement permits (via its `evidenceRefs`) are surfaced
 *   for that requirement. When omitted, no evidence context is rendered.
 */
export function buildPromptContract(
  contentPlan: ContentPlan,
  config: CopywriterConfig,
  evidence?: EvidenceSet[]
): PromptContract {
  const instructions: PromptInstruction[] = [];

  for (const requirement of contentPlan.requirements) {
    instructions.push(buildInstruction(requirement, config, evidence));
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
 *
 * Evidence context:
 *   The serialized text of ONLY the evidence items whose ids appear in the
 *   requirement's permitted refs. This is derived from the supplied `evidence`
 *   and the requirement's `evidenceRefs`. When the requirement is generic-safe
 *   or no matching evidence was supplied, the context is empty.
 */
export function buildInstruction(
  requirement: ContentPlanRequirement,
  config: CopywriterConfig,
  evidence?: EvidenceSet[]
): PromptInstruction {
  const genericSafe =
    requirement.factAvailability === 'generic_safe' ||
    requirement.factAvailability === 'unavailable';

  const allowedEvidenceRefs = genericSafe
    ? []
    : [...requirement.evidenceRefs];

  const evidenceContext = serializeEvidenceContext(
    allowedEvidenceRefs,
    evidence
  );

  return {
    requirementId: requirement.id,
    objective: requirement.description,
    shape: requirement.shape,
    fields: [...requirement.fields],
    tone: config.tone,
    genericSafe,
    allowedEvidenceRefs,
    prohibitedInventions: [...requirement.mustNotInvent],
    evidenceContext,
  };
}

/**
 * Serializes the concrete evidence context for a requirement.
 *
 * Only the evidence items whose ids appear in `allowedEvidenceRefs` are
 * surfaced. The serialized form is a stable, human-readable string per item so
 * a provider can render it directly into the LLM prompt. It NEVER invents facts
 * and NEVER surfaces evidence the ContentPlan did not permit.
 */
function serializeEvidenceContext(
  allowedEvidenceRefs: string[],
  evidence?: EvidenceSet[]
): string[] {
  if (!evidence || evidence.length === 0 || allowedEvidenceRefs.length === 0) {
    return [];
  }

  const allowed = new Set(allowedEvidenceRefs);
  const context: string[] = [];

  for (const set of evidence) {
    for (const item of set.items) {
      if (!allowed.has(item.id)) {
        continue;
      }
      context.push(serializeEvidence(item));
    }
  }

  return context;
}

/**
 * Serializes a single evidence item into a stable, human-readable string.
 *
 * The serialized form carries the claim and any optional detail. It does NOT
 * carry provenance or internal ids into the prompt (the model does not need
 * them and they are not business content).
 */
function serializeEvidence(item: Evidence): string {
  if (item.detail) {
    return `${item.claim} — ${item.detail}`;
  }
  return item.claim;
}
