/**
 * AWIE V2 - PromptBuilder Interface.
 *
 * The PromptBuilder converts higher-level requests (from the Question Engine,
 * Recipe Engine, etc.) into provider-agnostic AIRequests. It is the ONLY
 * component that knows how to phrase prompts; it never formats provider-native
 * payloads (that is the ProviderAdapter's job).
 *
 * STRICT CONSTRAINT: This interface MUST NOT contain any business logic. It
 * defines the contract only. Concrete prompt builders (implemented in a later
 * step) may encode prompt phrasing but never business decisions.
 */

import type { AIRequest, ChatMessage, GenerationMode } from '../types';

/**
 * A generic, provider-agnostic prompt request. Higher-level engines produce
 * these; the PromptBuilder turns them into AIRequests.
 */
export interface PromptRequest {
  /** The system instruction that frames the model's behavior. */
  system?: string;
  /** The user-facing request content. */
  user: string;
  /** The generation mode (structured or text). */
  mode: GenerationMode;
  /** Optional JSON Schema constraining structured output. */
  schema?: unknown;
  /** Optional temperature override. */
  temperature?: number;
  /** Optional maximum output tokens. */
  maxTokens?: number;
  /** Optional prior conversation turns for multi-turn or repair flows. */
  history?: ChatMessage[];
  /** Optional request-level metadata. */
  metadata?: Record<string, unknown>;
}

/**
 * The PromptBuilder converts higher-level prompt requests into
 * provider-agnostic AIRequests.
 */
export interface PromptBuilder {
  /**
   * Builds a complete AIRequest from a PromptRequest. The returned request is
   * provider-agnostic and ready for the AI Engine to execute.
   */
  build(request: PromptRequest): AIRequest;

  /**
   * Builds a repair request that asks the model to fix a previously invalid
   * output. Used by the retry/validation flow.
   */
  buildRepair(
    original: AIRequest,
    invalidOutput: string,
    validationError: string
  ): AIRequest;
}
