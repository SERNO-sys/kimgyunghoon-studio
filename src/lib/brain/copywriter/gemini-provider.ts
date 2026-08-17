/**
 * AWIE V2 Brain — AI #2 Gemini-backed Copywriter provider (Step 11).
 *
 * This is the REAL provider implementation of the provider-independent
 * `CopywriterProvider` interface. It uses the existing V1 AI Engine
 * (`getAiEngine()` + `generateStructured()`) to produce a schema-validated
 * `GeneratedContentSet` from a `ContentPlan`.
 *
 * TWO-SCHEMA BOUNDARY (system-owned identifiers):
 *   The model is asked to produce ONLY AI-owned semantic content. It is NEVER
 *   asked to invent system identifiers (`id`, `contentPlanId`, `requirementId`,
 *   `shape`, `factReferences`). The provider therefore validates the RAW LLM
 *   output against `llmGeneratedContentSetSchema` (which requires only
 *   `items[].fields`), then assembles the FINAL `GeneratedContentSet` by
 *   injecting the system-owned identifiers from the authoritative ContentPlan,
 *   and finally validates the complete result against the canonical
 *   `generatedContentSetSchema`.
 *
 *   LLM output schema
 *     → system normalization/assembly (inject system-owned identifiers)
 *     → final GeneratedContentSet schema
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *   - This provider is EXPRESSION ONLY. It NEVER decides capabilities, states,
 *     business models, sections, components, layouts, recipes, or themes.
 *   - It NEVER invents business facts. It receives the ContentPlan (the
 *     authoritative instruction boundary) and the deterministic PromptContract
 *     built from it. The prompt instructs the model to fill ONLY the semantic
 *     fields the ContentPlan requires.
 *   - It NEVER mutates the ContentPlan.
 *   - It NEVER leaks UI / component / layout / ThemeConfig vocabulary into the
 *     output. The output is validated against `generatedContentSetSchema`.
 *
 * PROVIDER SELECTION:
 *   This provider is selected at the COMPOSITION ROOT (the autobuild route),
 *   NOT inside the Brain. `BrainGoldenPath` stays provider-agnostic and accepts
 *   any `CopywriterProvider`. When Gemini is not configured, the composition
 *   root falls back to the deterministic `MockCopywriterProvider`.
 *
 * STRICT CONSTRAINT: This module MUST NOT import React, HTML, CSS, ThemeConfig,
 * Renderer, or any UI concept. It MUST NOT generate or rewrite content outside
 * the ContentPlan boundary. It MUST NOT infer new business facts.
 */

import { getAiEngine } from '../../ai/engine';
import type { ContentPlan } from '../content-plan';
import { buildPromptContract } from './prompt-builder';
import {
  generatedContentSetSchema,
  llmGeneratedContentSetSchema,
  type CopywriterConfig,
  type CopywriterProvider,
  type CopywriterRequest,
  type GeneratedContent,
  type GeneratedContentSet,
  type LLMGeneratedContentSet,
} from './types';

/**
 * The Gemini-backed AI #2 provider.
 *
 * It implements the `CopywriterProvider` interface so the Brain depends on the
 * interface, not on a specific AI vendor. It delegates to the existing V1 AI
 * Engine for provider resolution, retry, sanitization, and schema validation.
 */
export class GeminiCopywriterProvider implements CopywriterProvider {
  readonly name = 'gemini';

  /**
   * Generates a schema-validated GeneratedContentSet for the request.
   *
   * The prompt is derived deterministically from the ContentPlan via
   * `buildPromptContract`. The engine validates the RAW model output against
   * `llmGeneratedContentSetSchema` (AI-owned semantic content only). The
   * provider then assembles the FINAL `GeneratedContentSet` by injecting the
   * system-owned identifiers from the ContentPlan, and validates the complete
   * result against the canonical `generatedContentSetSchema`.
   *
   * This is async because it awaits an external LLM call through the engine.
   */
  async generate(request: CopywriterRequest): Promise<GeneratedContentSet> {
    const { contentPlan, config, evidence } = request;

    // Build the deterministic prompt contract from the ContentPlan. This is the
    // ONLY instruction boundary — the model may not add requirements. The
    // request's evidence is passed so the builder can surface ONLY the concrete
    // facts that each requirement explicitly permits (via its `evidenceRefs`).
    const prompt = buildPromptContract(contentPlan, config, evidence);


    const engine = getAiEngine();
    const result = await engine.generateStructured(llmGeneratedContentSetSchema, {
      flow: 'brain-copywriter',
      model: 'general-default',
      system: buildSystemPrompt(config),
      prompt: buildUserPrompt(prompt),
      temperature: 0.4,
      maxOutputTokens: 2048,
    });

    if (!result.ok) {
      throw new Error(
        `AI #2 copywriter generation failed (${result.reason}): ${
          result.issues?.join('; ') ?? 'unknown'
        }`
      );
    }

    // Assemble the FINAL GeneratedContentSet by injecting the system-owned
    // identifiers from the authoritative ContentPlan.
    const assembled = assembleGeneratedContentSet(contentPlan, result.data);

    // Validate the complete result against the canonical schema. This is the
    // final contract boundary — it is NEVER weakened.
    const finalValidation = generatedContentSetSchema.safeParse(assembled);
    if (!finalValidation.success) {
      throw new Error(
        `AI #2 copywriter assembly failed (schema_mismatch): ${finalValidation.error.issues
          .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
          .join('; ')}`
      );
    }

    return finalValidation.data;
  }
}

/**
 * Assembles the FINAL `GeneratedContentSet` from the RAW LLM output and the
 * authoritative ContentPlan.
 *
 * The model supplies ONLY the AI-owned semantic `fields`. Every system-owned
 * identifier is injected deterministically from the ContentPlan:
 *   - GeneratedContentSet.id        = `generated-${contentPlan.id}`
 *   - GeneratedContentSet.contentPlanId = contentPlan.id
 *   - item.id                       = `content-${requirement.id}`
 *   - item.requirementId            = requirement.id
 *   - item.shape                    = requirement.shape
 *   - item.factReferences           = requirement.evidenceRefs (permitted refs)
 *   - item.fields                   = model fields
 *   - item.body                     = deterministic flattening of item.fields
 *
 * The number of generated items MUST exactly equal the number of ContentPlan
 * requirements, and they are matched by index (the prompt instructs the model
 * to emit one item per requirement, in order). A mismatch is a hard contract
 * error — never a silent pass.
 */
function assembleGeneratedContentSet(
  contentPlan: ContentPlan,
  raw: LLMGeneratedContentSet
): GeneratedContentSet {
  const requirements = contentPlan.requirements;

  if (raw.items.length !== requirements.length) {
    throw new Error(
      `AI #2 copywriter assembly failed (item_count_mismatch): expected ${requirements.length} items for ContentPlan requirements, got ${raw.items.length}`
    );
  }

  const items: GeneratedContent[] = raw.items.map((rawItem, index) => {
    const requirement = requirements[index];
    return {
      id: `content-${requirement.id}`,
      requirementId: requirement.id,
      shape: requirement.shape,
      fields: rawItem.fields,
      body: flattenFields(rawItem.fields),
      factReferences: [...requirement.evidenceRefs],
    };
  });

  return {
    id: `generated-${contentPlan.id}`,
    contentPlanId: contentPlan.id,
    items,
  };
}

/**
 * Deterministically flattens the structured semantic fields into a single text
 * string. This is the compatibility `body` field retained for the Fact
 * Validator's text-based checks and any legacy consumers. It is derived purely
 * from the model's own fields — it never invents content.
 */
function flattenFields(fields: GeneratedContent['fields']): string {
  const parts: string[] = [];
  if (fields.headline) parts.push(fields.headline);
  if (fields.subheadline) parts.push(fields.subheadline);
  if (fields.title) parts.push(fields.title);
  if (fields.body) parts.push(fields.body);
  if (fields.cta) parts.push(fields.cta);
  if (fields.items && fields.items.length > 0) {
    for (const item of fields.items) {
      const itemParts: string[] = [item.name];
      if (item.description) itemParts.push(item.description);
      if (item.role) itemParts.push(item.role);
      if (item.bio) itemParts.push(item.bio);
      parts.push(itemParts.join(' '));
    }
  }
  return parts.join(' ');
}

/**
 * Builds the system prompt for AI #2.
 *
 * This is EXPRESSION guidance only. It constrains HOW the copy is written and
 * what the model may NOT do. It MUST NOT add business requirements, capabilities,
 * sections, components, layouts, or design choices.
 */
function buildSystemPrompt(config: CopywriterConfig): string {
  return [
    'You are the EXPRESSION LAYER of a website generation system.',
    'Your ONLY job is to write website copy that satisfies the content requirements you are given.',
    '',
    'You MUST NOT decide capabilities, business models, page structure, sections, components, layouts, recipes, or themes.',
    'You MUST NOT invent concrete business facts (prices, dates, addresses, names, testimonials, contact details).',
    'You MUST NOT add content requirements that were not given to you.',
    'You MUST NOT reference React, CSS, HTML, layout, theme, or recipe concepts in your output.',
    '',
    `Write in the language: ${config.language}.`,
    `Use the tone: ${config.tone}.`,
    '',
    'Return ONLY a JSON object matching the required schema. Do not include markdown fences or commentary.',
  ].join('\n');
}

/**
 * Builds the user prompt from the deterministic PromptContract.
 *
 * The contract carries requirement identity, semantic shape/fields, tone,
 * generic-safe flags, allowed evidence refs, and prohibited inventions. The
 * model fills ONLY the semantic `fields`. It is explicitly told NOT to emit any
 * system-owned identifiers (`id`, `contentPlanId`, `requirementId`, `shape`,
 * `factReferences`) — those are injected by the provider.
 */
function buildUserPrompt(
  prompt: ReturnType<typeof buildPromptContract>
): string {
  const lines: string[] = [
    `ContentPlan id: ${prompt.contentPlanId}`,
    `Language: ${prompt.language}`,
    `Tone: ${prompt.tone}`,
    '',
    'Return ONLY a JSON object with this exact shape:',
    '{',
    '  "items": [',
    '    {',
    '      "fields": {',
    '        ...',
    '      }',
    '    }',
    '  ]',
    '}',
    '',
    'Produce EXACTLY ONE item per requirement below, in the same order.',
    'Do NOT include id, contentPlanId, requirementId, shape, factReferences, or any "contents" wrapper.',
    'The system supplies those identifiers itself.',
    '',
    'For each item, the `fields` object MUST use ONLY these semantic keys, matching the shape:',
    '  - hero:    { headline, subheadline, cta }',
    '  - text:    { title, body }',
    '  - list:    { title, items: [{ name, description }] }',
    '  - grid:    { title, items: [{ name, role, bio }] }',
    '  - contact: { title, body, cta }',
    '',
    'Do NOT add any other keys to `fields`. Do NOT include UI, layout, theme, or recipe vocabulary.',
    '',
    'Requirements:',
  ];

  for (const instruction of prompt.instructions) {
    lines.push(
      `- requirementId: ${instruction.requirementId}`,
      `  objective: ${instruction.objective}`,
      `  shape: ${instruction.shape}`,
      `  fields: ${instruction.fields.join(', ')}`,
      `  genericSafe: ${instruction.genericSafe}`,
      `  allowedEvidenceRefs: ${instruction.allowedEvidenceRefs.join(', ') || '(none)'}`,
      `  prohibitedInventions: ${instruction.prohibitedInventions.join(', ') || '(none)'}`,
      ''
    );

    // Surface ONLY the concrete evidence this requirement explicitly permits.
    // These are the exact facts the model may reference when writing the copy.
    // When the requirement is generic-safe (or no evidence was permitted), the
    // context is empty and the model must stay generic-safe.
    if (instruction.evidenceContext.length > 0) {
      lines.push('  permittedEvidence:');
      for (const item of instruction.evidenceContext) {
        lines.push(`    - ${item}`);
      }
      lines.push('');
    }
  }


  return lines.join('\n');
}
