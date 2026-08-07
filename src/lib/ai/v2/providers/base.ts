/**
 * AWIE V2 - BaseProviderAdapter.
 *
 * The BaseProviderAdapter is the abstract base class that all concrete provider
 * adapters (Gemini, Claude, OpenAI, DeepSeek, OpenRouter) extend. It implements
 * the shared, provider-independent plumbing of the ProviderAdapter contract:
 *
 *   - Normalizing requests (default model, timeout, mode)
 *   - Measuring latency
 *   - Mapping provider errors to structured AIErrors
 *   - Enforcing the streaming contract
 *
 * Concrete adapters implement ONLY the provider-specific transport:
 * `doGenerate` and `doStream`. This keeps provider-specific logic isolated to
 * the concrete adapter while all shared behavior lives here.
 *
 * STRICT CONSTRAINT: This class MUST NOT contain any business logic or
 * provider-specific behavior. It is pure infrastructure.
 */

import type {
  AIError,
  AIErrorCode,
  AIRequest,
  AIResponse,
  ProviderCapabilities,
  ProviderConfig,
  ProviderId,
  StreamChunk,
} from '../types';
import type { ProviderAdapter } from './types';

/**
 * A structured error thrown by provider adapters. The AI Engine maps this to a
 * normalized AIError. Concrete adapters throw this with a provider-independent
 * code so the engine never needs to parse provider-specific error strings.
 */
export class AIProviderError extends Error {
  readonly code: AIErrorCode;
  readonly retryable: boolean;
  readonly provider?: ProviderId;
  readonly model?: string;
  readonly cause?: unknown;

  constructor(
    code: AIErrorCode,
    message: string,
    options: {
      retryable?: boolean;
      provider?: ProviderId;
      model?: string;
      cause?: unknown;
    } = {}
  ) {
    super(message);
    this.name = 'AIProviderError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.provider = options.provider;
    this.model = options.model;
    this.cause = options.cause;
  }

  /** Converts this error into the normalized AIError shape. */
  toAIError(): AIError {
    return {
      code: this.code,
      message: this.message,
      provider: this.provider,
      model: this.model,
      cause: this.cause,
      retryable: this.retryable,
    };
  }
}

/**
 * Abstract base class for all provider adapters.
 */
export abstract class BaseProviderAdapter implements ProviderAdapter {
  readonly provider: ProviderId;
  readonly config: ProviderConfig;

  constructor(provider: ProviderId, config: ProviderConfig) {
    this.provider = provider;
    this.config = { ...config, provider };
  }


  /**
   * Executes a single generation request. Measures latency, normalizes the
   * response, and maps provider errors to AIProviderError.
   */
  async generate(request: AIRequest): Promise<AIResponse> {
    const startedAt = Date.now();
    const normalized = this.normalizeRequest(request);

    try {
      const response = await this.doGenerate(normalized);
      return {
        ...response,
        provider: this.provider,
        model: normalized.model,
        latencyMs: Date.now() - startedAt,
      };
    } catch (err) {
      throw this.mapError(err, normalized);
    }
  }

  /**
   * Streams a generation request. Concrete adapters implement `doStream`; this
   * wrapper normalizes the request and maps errors.
   */
  async *stream(request: AIRequest): AsyncIterable<StreamChunk> {
    const normalized = this.normalizeRequest(request);

    try {
      for await (const chunk of this.doStream(normalized)) {
        yield {
          ...chunk,
          provider: this.provider,
          model: normalized.model,
        };
      }
    } catch (err) {
      throw this.mapError(err, normalized);
    }
  }

  /**
   * Returns whether this adapter is usable. By default, an adapter is available
   * when an API key is configured. Concrete adapters may override this.
   */
  isAvailable(): boolean {
    return Boolean(this.config.apiKey);
  }

  /**
   * Returns the provider's capabilities. Concrete adapters override this to
   * report their actual capabilities.
   */
  abstract capabilities(): ProviderCapabilities;

  /**
   * Provider-specific generation. Concrete adapters implement this by calling
   * their provider's SDK/HTTP API and returning a normalized AIResponse.
   */
  protected abstract doGenerate(request: AIRequest): Promise<AIResponse>;

  /**
   * Provider-specific streaming. Concrete adapters implement this by yielding
   * normalized StreamChunks from their provider's stream.
   */
  protected abstract doStream(request: AIRequest): AsyncIterable<StreamChunk>;

  /**
   * Normalizes a request by applying the provider's default model and timeout.
   * Concrete adapters may override to apply provider-specific defaults, but
   * must call super() first.
   */
  protected normalizeRequest(request: AIRequest): AIRequest {
    return {
      ...request,
      model: request.model || this.config.defaultModel,
    };
  }

  /**
   * Maps an unknown error to an AIProviderError. Concrete adapters may override
   * to translate provider-specific error codes into provider-independent ones.
   */
  protected mapError(err: unknown, request: AIRequest): AIProviderError {
    if (err instanceof AIProviderError) {
      return err;
    }

    const message = err instanceof Error ? err.message : String(err);

    // Heuristic mapping for common transport-level failures. Concrete adapters
    // should override this to map their provider's specific error codes.
    const lower = message.toLowerCase();
    let code: AIErrorCode = 'UNKNOWN';
    let retryable = false;

    if (lower.includes('rate') || lower.includes('429') || lower.includes('quota')) {
      code = 'RATE_LIMITED';
      retryable = true;
    } else if (lower.includes('timeout') || lower.includes('timed out')) {
      code = 'TIMEOUT';
      retryable = true;
    } else if (
      lower.includes('auth') ||
      lower.includes('401') ||
      lower.includes('403') ||
      lower.includes('api key')
    ) {
      code = 'AUTHENTICATION_FAILED';
      retryable = false;
    } else if (lower.includes('unavailable') || lower.includes('503') || lower.includes('502')) {
      code = 'PROVIDER_UNAVAILABLE';
      retryable = true;
    } else if (lower.includes('invalid') || lower.includes('400')) {
      code = 'INVALID_REQUEST';
      retryable = false;
    }

    return new AIProviderError(code, message, {
      retryable,
      provider: this.provider,
      model: request.model,
      cause: err,
    });
  }
}
