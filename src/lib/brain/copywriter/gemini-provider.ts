/**
 * AWIE V2 Brain — AI #2 Gemini-backed Copywriter provider (Step 11).
 *
 * This is the REAL provider implementation of the provider-independent
 * `CopywriterProvider` interface. It uses the existing V1 AI Engine
 * (`getAiEngine()` + `generateStructured()`) to produce a schema-validated
 * `GeneratedContentSet` from a `ContentPlan`.
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *   - This provider is EXPRESSION ONLY. It NEVER decides capabilities, states,
 *     business models, sections, components, layouts, recipes, or themes.
 *   - It NEVER invents business facts. It receives the ContentPlan (the
 *     authoritative instruction boundary) and the deterministic PromptContract
 *     built from it. The prompt instructs the model to fill ONLY the semantic
 *     fields the ContentPlan requires, and to attach ONLY the permitted
 *     evidence refs.
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
  type CopywriterConfig,
  type CopywriterProvider,
  type CopywriterRequest,
  type GeneratedContentSet,
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
   * `buildPromptContract`. The engine validates the model output against
   * `generatedContentSetSchema`; a schema mismatch is reported as a structured
   * failure (never a silent pass).
   *
   * This is async because it awaits an external LLM call through the engine.
   */
  async generate(request: CopywriterRequest): Promise<GeneratedContentSet> {
    const { contentPlan, config } = request;

    // Build the deterministic prompt contract from the ContentPlan. This is the
    // ONLY instruction boundary — the model may not add requirements.
    const prompt = buildPromptContract(contentPlan, config);

    const engine = getAiEngine();
    const result = await engine.generateStructured(generatedContentSetSchema, {
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

    return result.data;
  }
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
 * model fills ONLY these fields.
 */
function buildUserPrompt(
  prompt: ReturnType<typeof buildPromptContract>
): string {
  const lines: string[] = [
    `ContentPlan id: ${prompt.contentPlanId}`,
    `Language: ${prompt.language}`,
    `Tone: ${prompt.tone}`,
    '',
    'For each requirement, produce a content item with:',
    '  - id: a stable unique id',
    '  - requirementId: the requirement id (exact match)',
    '  - shape: the exact shape given for the requirement',
    '  - fields: an object whose keys are the exact semantic fields for that shape, filled with the generated copy',
    '  - body: a single flattened text string that concatenates the generated fields (used for validation)',
    '  - factReferences: ONLY the allowed evidence refs, or [] when none are allowed',
    '',
    'The `fields` object MUST use ONLY these semantic keys, matching the shape:',
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
  }

  return lines.join('\n');
}
