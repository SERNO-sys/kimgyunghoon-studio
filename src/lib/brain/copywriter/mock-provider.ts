/**
 * AWIE V2 Brain — AI #2 deterministic mock provider (Step 11).
 *
 * The mock provider is a minimal, deterministic implementation of the
 * provider-independent `CopywriterProvider` interface. It is used ONLY to prove:
 *   - interface compatibility,
 *   - output validation,
 *   - requirement identity preservation,
 *   - state preservation,
 *   - no UI leakage.
 *
 * It does NOT simulate intelligence. It is NOT a fake sophisticated copywriter.
 * It does NOT call an LLM. It does NOT connect to any external AI API.
 *
 * DETERMINISM:
 *   Same ContentPlan + same config = same GeneratedContentSet. No randomness.
 *
 * STATE BEHAVIOR:
 *   The mock only generates content for requirements present in the ContentPlan
 *   `requirements` array (ACTIVE / GENERIC). It NEVER generates content for
 *   DORMANT or DROP capabilities (they have no requirement entries). It NEVER
 *   changes capability states.
 *
 * FACT BOUNDARY:
 *   The mock attaches fact references ONLY from the requirement's own
 *   `evidenceRefs`, and ONLY when `factAvailability` is `available`. For
 *   `generic_safe` / `unavailable` requirements it attaches NO references and
 *   produces generic-safe body text.
 *
 * STRICT CONSTRAINT: This module MUST NOT import React, HTML, CSS, ThemeConfig,
 * Renderer, or any UI concept. It MUST NOT modify ContentPlan.
 */

import type { ContentPlanRequirement } from '../content-plan';
import type {
  CopywriterProvider,
  CopywriterRequest,
  GeneratedContent,
  GeneratedContentFields,
  GeneratedContentSet,
} from './types';


/**
 * The deterministic mock provider.
 *
 * It implements the `CopywriterProvider` interface so a future LLM adapter can
 * be swapped in without changing the Brain's dependency on the interface.
 */
export class MockCopywriterProvider implements CopywriterProvider {
  readonly name = 'mock';

  /**
   * Generates a deterministic GeneratedContentSet for the request.
   *
   * This is a pure, side-effect-free function. It NEVER mutates the ContentPlan.
   * It NEVER invents business facts. It NEVER adds capabilities, sections,
   * components, layouts, or design choices.
   *
   * It is async to satisfy the provider-independent `CopywriterProvider`
   * interface, but it performs no I/O and resolves deterministically.
   */
  async generate(request: CopywriterRequest): Promise<GeneratedContentSet> {
    const { contentPlan, config } = request;
    const items: GeneratedContent[] = [];

    for (const requirement of contentPlan.requirements) {
      items.push(buildMockItem(requirement, config.tone));
    }

    return {
      id: `generated-${contentPlan.id}`,
      contentPlanId: contentPlan.id,
      items,
    };
  }
}


/**
 * Builds a single deterministic mock content item for a requirement.
 *
 * The body is a deterministic, generic-safe expression derived from the
 * requirement's own contract data. It NEVER invents concrete business facts.
 *
 * Fact references:
 *   Only attached when `factAvailability` is `available` (concrete facts are
 *   permitted). For `generic_safe` / `unavailable`, no references are attached.
 */
function buildMockItem(
  requirement: ContentPlanRequirement,
  tone: string
): GeneratedContent {
  const factAvailable = requirement.factAvailability === 'available';

  return {
    id: `content-${requirement.id}`,
    requirementId: requirement.id,
    shape: requirement.shape,
    fields: buildMockFields(requirement),
    body: buildMockBody(requirement, tone),
    factReferences: factAvailable ? [...requirement.evidenceRefs] : [],
  };
}

/**
 * Builds deterministic structured semantic fields for a requirement.
 *
 * The fields mirror the requirement's semantic SHAPE (hero/text/list/grid/
 * contact). They are SEMANTIC — they are NOT renderer / ThemeConfig / layout
 * vocabulary. The mock fills each field with generic-safe placeholder text
 * derived from the requirement's own description so the RecipeMerger can map
 * them into ThemeConfig sections deterministically.
 */
function buildMockFields(
  requirement: ContentPlanRequirement
): GeneratedContentFields {
  const description = requirement.description;
  const fields: GeneratedContentFields = {};

  switch (requirement.shape) {
    case 'hero':
      fields.headline = description;
      fields.subheadline = description;
      fields.cta = description;
      break;
    case 'text':
      fields.title = description;
      fields.body = description;
      break;
    case 'list':
      fields.title = description;
      fields.items = [{ name: description, description }];
      break;
    case 'grid':
      fields.title = description;
      fields.items = [{ name: description, role: description, bio: description }];
      break;
    case 'contact':
      fields.title = description;
      fields.body = description;
      fields.cta = description;
      break;
  }

  return fields;
}


/**
 * Builds a deterministic, generic-safe mock body.
 *
 * The body is derived from the requirement's semantic description and the tone
 * constraint. It is deliberately generic — it does NOT contain prices, dates,
 * addresses, names, testimonials, or any concrete business fact.
 *
 * The requirement's SHAPE and FIELDS are carried in the PromptContract (the
 * prompt layer), NOT in the generated content body. The generated body is pure
 * generic-safe expression text and MUST NOT leak semantic structure or any
 * UI / layout / ThemeConfig vocabulary.
 */
function buildMockBody(
  requirement: ContentPlanRequirement,
  tone: string
): string {
  return `[${tone}] ${requirement.description}`;
}



