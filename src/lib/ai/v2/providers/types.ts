/**
 * AWIE V2 - ProviderAdapter Interface.
 *
 * The ProviderAdapter is the single common interface that every AI provider
 * (Gemini, Claude, OpenAI, DeepSeek, OpenRouter, and future providers) must
 * implement. Business logic and the AI Engine depend ONLY on this interface,
 * never on a concrete provider SDK.
 *
 * STRICT CONSTRAINT: This interface MUST NOT contain any business logic or
 * provider-specific behavior. Provider-specific logic lives exclusively inside
 * the concrete adapter implementations in this directory.
 */

import type {
  AIRequest,
  AIResponse,
  ProviderCapabilities,
  ProviderConfig,
  ProviderId,
  StreamChunk,
} from '../types';

/**
 * The common interface all provider adapters implement.
 *
 * A concrete adapter wraps a single provider's SDK/HTTP API and normalizes its
 * inputs and outputs to the provider-agnostic shapes defined in `../types`.
 */
export interface ProviderAdapter {
  /** The provider identifier this adapter serves. */
  readonly provider: ProviderId;

  /** The configuration this adapter was constructed with. */
  readonly config: ProviderConfig;

  /**
   * Executes a single generation request and returns a normalized response.
   * Implementations MUST NOT throw for expected provider errors; they should
   * return a structured AIError via the `generateOrThrow` contract or throw an
   * `AIProviderError` that the engine can map. See `BaseProviderAdapter`.
   */
  generate(request: AIRequest): Promise<AIResponse>;

  /**
   * Streams a generation request, emitting normalized chunks. Implementations
   * that do not support streaming should reject with a clear error.
   */
  stream(request: AIRequest): AsyncIterable<StreamChunk>;

  /**
   * Returns the capabilities of this provider (structured output, streaming,
   * available models). Used by the AI Engine for provider selection.
   */
  capabilities(): ProviderCapabilities;

  /**
   * Returns whether this adapter is usable (e.g. an API key is configured).
   * The AI Engine uses this to skip unavailable providers during selection.
   */
  isAvailable(): boolean;
}
