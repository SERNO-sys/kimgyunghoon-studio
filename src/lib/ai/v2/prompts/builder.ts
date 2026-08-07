/**
 * AWIE V2 - PromptBuilder implementation.
 *
 * The PromptBuilder converts higher-level requests (from the Question Engine,
 * Recipe Engine, etc.) into provider-agnostic AIRequests. It is the ONLY
 * component that knows how to phrase prompts; it never formats provider-native
 * payloads (that is the ProviderAdapter's job).
 *
 * Structured Generation First: when a request targets structured output, the
 * builder appends explicit JSON-generation instructions to the system prompt so
 * every provider is steered toward emitting a single, valid JSON object. The
 * exact JSON Schema is passed through generically (never hardcoded here).
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic or
 * provider-specific formatting. It is pure infrastructure.
 */

import type { AIRequest, ChatMessage, GenerationMode } from '../types';
import type { PromptBuilder, PromptRequest } from './types';

/** Default system framing used when a request provides no system prompt. */
const DEFAULT_SYSTEM =
  'You are a precise, structured-output assistant. Follow the user instructions exactly and return only the requested output.';

/** Structured-output instruction appended to the system prompt. */
const STRUCTURED_INSTRUCTION = `
OUTPUT FORMAT (STRICT):
- Respond with a SINGLE valid JSON object only.
- Do NOT wrap the JSON in markdown code fences.
- Do NOT include any prose, commentary, or explanation outside the JSON.
- The JSON MUST conform exactly to the provided JSON Schema.
- Use double quotes for all keys and string values.
- Do not include trailing commas.
`;

/**
 * A generic, provider-agnostic PromptBuilder.
 *
 * Higher-level engines construct a `PromptRequest` and call `build()` to obtain
 * a ready-to-execute `AIRequest`. The builder is stateless and safe to share.
 */
export class PromptBuilderImpl implements PromptBuilder {
  /**
   * Builds a complete AIRequest from a PromptRequest.
   */
  build(request: PromptRequest): AIRequest {
    const mode: GenerationMode = request.mode ?? 'text';
    const system = this.buildSystemPrompt(request);
    const messages = this.buildMessages(request);

    return {
      model: '', // resolved by the provider adapter's default model
      system,
      prompt: request.user,
      messages,
      temperature: request.temperature,
      maxOutputTokens: request.maxTokens,
      mode,
    };
  }

  /**
   * Builds a repair request that asks the model to fix a previously invalid
   * output. Used by the retry/validation flow.
   */
  buildRepair(
    original: AIRequest,
    invalidOutput: string,
    validationError: string
  ): AIRequest {
    const repairSystem = [
      original.system ?? DEFAULT_SYSTEM,
      STRUCTURED_INSTRUCTION,
      '',
      'REPAIR INSTRUCTION:',
      'Your previous output was rejected because it did not conform to the required format.',
      'Fix the output below so it is a single valid JSON object matching the schema.',
      'Return ONLY the corrected JSON object with no markdown fences or prose.',
    ].join('\n');

    const repairUser = [
      'PREVIOUS OUTPUT (INVALID):',
      '```',
      invalidOutput,
      '```',
      '',
      'VALIDATION ERROR:',
      validationError,
      '',
      'Please return the corrected JSON object now.',
    ].join('\n');

    return {
      ...original,
      system: repairSystem,
      prompt: repairUser,
      messages: [
        { role: 'system', content: repairSystem },
        { role: 'user', content: repairUser },
      ],
      mode: 'structured',
    };
  }

  /**
   * Builds the system prompt, appending structured-output instructions when the
   * request targets structured generation.
   */
  private buildSystemPrompt(request: PromptRequest): string {
    const base = request.system ?? DEFAULT_SYSTEM;
    if (request.mode !== 'structured') {
      return base;
    }

    const schemaBlock = request.schema
      ? `\nJSON SCHEMA:\n${JSON.stringify(request.schema, null, 2)}`
      : '';

    return [base, STRUCTURED_INSTRUCTION, schemaBlock].join('\n');
  }

  /**
   * Builds the message list, prepending any prior conversation history.
   */
  private buildMessages(request: PromptRequest): ChatMessage[] {
    const messages: ChatMessage[] = [];

    if (request.history && request.history.length > 0) {
      messages.push(...request.history);
    }

    messages.push({ role: 'user', content: request.user });
    return messages;
  }
}
