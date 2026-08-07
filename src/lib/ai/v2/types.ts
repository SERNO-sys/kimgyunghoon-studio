/**
 * AWIE V2 - Core shared types for the provider-independent AI infrastructure.
 *
 * These types are the contract between the AIEngine, ProviderAdapter, and the
 * pipeline stages (PromptBuilder, Sanitizer, Validator, Telemetry). They are
 * deliberately provider-agnostic: no Gemini/Claude/OpenAI/DeepSeek specifics
 * live here.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic.
 */

/** Supported provider identifiers. */
export type ProviderId = 'gemini' | 'claude' | 'openai' | 'deepseek' | 'mock';

/** A single chat message in a conversation. */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Generation modes supported by the engine. */
export type GenerationMode = 'text' | 'structured' | 'stream';

/** A normalized request sent to a provider adapter. */
export interface AIRequest {
  model: string;
  system?: string;
  prompt: string;
  messages?: ChatMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  mode?: GenerationMode;
}

/** Normalized token usage returned by a provider. */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/** A normalized response returned by a provider adapter. */
export interface AIResponse {
  text: string;
  usage: TokenUsage;
  finishReason?: string;
  /** The provider that produced this response. */
  provider?: ProviderId;
  /** The model that produced this response. */
  model?: string;
  /** Measured latency in milliseconds. */
  latencyMs?: number;
  /** Provider-specific raw payload (for debugging/telemetry). */
  raw?: unknown;
}

/** A single chunk of a streaming response. */
export interface StreamChunk {
  /** The incremental text delta for this chunk. */
  delta: string;
  /** Whether this is the final chunk. */
  done?: boolean;
  /** The provider that produced this chunk. */
  provider?: ProviderId;
  /** The model that produced this chunk. */
  model?: string;
  /** Token usage, typically present on the final chunk. */
  usage?: TokenUsage;
}

/** Capabilities a provider adapter declares about itself. */
export interface ProviderCapabilities {
  /** Whether the provider supports structured output. */
  structuredOutput: boolean;
  /** Whether the provider supports streaming. */
  streaming: boolean;
  /** The models this provider exposes. */
  models: string[];
  /** Provider-specific capability metadata. */
  raw?: unknown;
}

/** Configuration for a provider adapter. */
export interface ProviderConfig {
  /** The provider identifier this adapter serves. */
  provider?: ProviderId;
  /** The default model to use when a request omits one. */
  defaultModel: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  [key: string]: unknown;
}


/** Error codes used across the AI pipeline. */
export type AIErrorCode =
  | 'UNKNOWN'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'PROVIDER_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'AUTHENTICATION_FAILED'
  | 'INVALID_REQUEST'
  | 'INVALID_RESPONSE'
  | 'VALIDATION_FAILED';

/** A normalized error thrown by the AI pipeline. */
export interface AIError {
  code: AIErrorCode;
  message: string;
  provider?: ProviderId;
  model?: string;
  retryable: boolean;
  cause?: unknown;
}

/** A cost estimate for a generation, in USD. */
export interface CostEstimate {
  /** The total estimated cost in USD. */
  totalUsd: number;
  /** The estimated input cost in USD. */
  inputUsd: number;
  /** The estimated output cost in USD. */
  outputUsd: number;
  /** The currency used (always USD for now). */
  currency: 'USD';
  /** The pricing source/version used to compute the estimate. */
  pricingVersion?: string;
}

/**
 * The unified result of a generation, returned by the AIEngine coordinator.
 *
 * It exposes standardized metadata so higher-level engines and telemetry can
 * reason about the run without reaching into provider internals.
 */
export interface AIResult {
  /** The generated text payload. */
  text: string;
  /** The parsed/validated payload, when structured generation was requested. */
  result?: unknown;
  /** Token usage for the run. */
  usage: TokenUsage;
  /** The provider that produced the result. */
  provider: ProviderId;
  /** The model that produced the result. */
  model: string;
  /** Total latency in milliseconds. */
  latencyMs: number;
  /** Number of attempts (1 + retries) performed. */
  attempts: number;
  /** Number of retries performed. */
  retryCount: number;
  /** Estimated cost in USD, when a pricing provider is configured. */
  cost?: CostEstimate;
  /** Whether the run succeeded. */
  ok: boolean;
  /** A normalized error when the run failed. */
  error?: AIError;
  /** Arbitrary run metadata (flow, request id, etc.). */
  metadata?: Record<string, unknown>;
}


