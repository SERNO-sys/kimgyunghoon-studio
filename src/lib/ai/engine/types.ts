/**
 * AWIE V1 - AI Engine types.
 *
 * NOTE: This file was reconstructed to restore the V1 engine after a V2
 * infrastructure build collided with the V1 directory layout. It preserves the
 * exact V1 type surface required by the existing engine, providers, models,
 * retry, and client modules.
 */

/** Provider identifiers supported by the V1 engine. */
export type AiProviderId = 'gemini' | 'mock';

/** A normalized provider request. */
export interface ProviderRequest {
  model: string;
  system?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/** Normalized token usage. */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/** A normalized provider response. */
export interface ProviderResponse {
  text: string;
  usage: TokenUsage;
}

/** The common interface every V1 provider adapter implements. */
export interface AiProvider {
  readonly id: AiProviderId;
  isConfigured(): boolean;
  generate(request: ProviderRequest): Promise<ProviderResponse>;
  generateStream(request: ProviderRequest): AsyncIterable<string>;
}

/** Model registry entry with pricing (USD per 1M tokens). */
export interface ModelInfo {
  provider: AiProviderId;
  model: string;
  inputCostPerMTok: number;
  outputCostPerMTok: number;
}

/** Cost estimate for a generation. */
export interface CostEstimate {
  usd: number;
  usage: TokenUsage;
}

/** Options for a generation request. */
export interface GenerateOptions {
  flow: string;
  model: string;
  system?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  promptVersion?: string;
  retry?: Partial<RetryPolicy>;
}

/** Result of a plain-text generation. */
export interface GenerateTextResult {
  text: string;
  usage: TokenUsage;
  cost: CostEstimate;
  provider: AiProviderId;
  model: string;
  latencyMs: number;
  attempts: number;
}

/** Result of a structured (schema-validated) generation. */
export type GenerateStructuredResult<T> =
  | ({ ok: true; data: T } & Omit<GenerateTextResult, 'text'> & { raw: string })
  | ({ ok: false; reason: string; issues?: string[] } & Omit<GenerateTextResult, 'text'> & {
      raw: string;
    });

/** Retry policy for transient failures. */
export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

/** Telemetry hooks invoked by the engine. */
export interface TelemetryHooks {
  onRequest?: (info: {
    flow: string;
    provider: AiProviderId;
    model: string;
    promptVersion?: string;
  }) => void;
  onResponse?: (info: {
    flow: string;
    provider: AiProviderId;
    model: string;
    latencyMs: number;
    attempts: number;
    usage: TokenUsage;
    cost: CostEstimate;
  }) => void;
  onRetry?: (info: {
    flow: string;
    provider: AiProviderId;
    model: string;
    attempt: number;
    error: string;
  }) => void;
  onError?: (info: {
    flow: string;
    provider: AiProviderId;
    model: string;
    error: string;
    attempts: number;
  }) => void;
}
