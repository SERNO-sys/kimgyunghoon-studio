/**
 * AWIE V2 - AIEngine (Coordinator) interface types.
 *
 * The AIEngine is a pure Coordinator/Facade. It orchestrates the pipeline:
 *
 *   Request -> ProviderResolver -> PipelineExecutor (Provider -> Sanitizer ->
 *   Validator with retry/repair) -> AIResult
 *
 * It holds NO business logic and NO provider-specific logic. It wires together
 * the provider-independent subsystems and returns a standardized AIResult.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic.
 */

import type { PricingProvider } from '../cost';
import type { PromptBuilder } from '../prompts';
import type { RetryStrategy } from '../retry';
import type { Sanitizer } from '../sanitize';
import type { Telemetry } from '../telemetry';
import type { AIError, AIResult, ProviderId, TokenUsage } from '../types';
import type { UsageTracker } from '../usage';
import type { Validator } from '../validation';
import type { ProviderRegistry, ProviderResolver } from './resolution';

/** A single generation request accepted by the AIEngine. */
export interface EngineRequest {
  /** The flow that triggered this request (e.g. 'hero', 'theme'). */
  flow: string;
  /** The preferred provider, if the caller has a preference. */
  preferredProvider?: ProviderId;
  /** The model to use. Defaults to the provider's default model. */
  model?: string;
  /** The system instruction. */
  system?: string;
  /** The user-facing prompt. */
  prompt: string;
  /** Temperature override. */
  temperature?: number;
  /** Maximum output tokens. */
  maxOutputTokens?: number;
  /** Arbitrary run metadata. */
  metadata?: Record<string, unknown>;
}

/** A structured generation request accepted by the AIEngine. */
export interface StructuredEngineRequest<T = unknown> extends EngineRequest {
  /** The schema to validate structured output against. */
  schema: unknown;
  /** The validator to use for this request. */
  validator?: unknown;
}

/** The result of provider selection. */
export interface ProviderSelection {
  provider: ProviderId;
  model: string;
}

/** A validator factory that builds a Validator from a schema. */
export type ValidatorFactory = (schema: unknown) => Validator;

/** Options for constructing the AIEngine coordinator. */
export interface EngineOptions {
  /** The provider registry. */
  registry: ProviderRegistry;
  /** The provider resolver. */
  resolver: ProviderResolver;
  /** The prompt builder. */
  promptBuilder: PromptBuilder;
  /** The sanitizer. */
  sanitizer: Sanitizer;
  /** The validator factory. */
  validatorFactory: ValidatorFactory;
  /** The retry strategy to use. */
  strategy: RetryStrategy;
  /** The default provider used when no preference is given. */
  defaultProvider?: ProviderId;
  /** The pricing provider for cost estimation. */
  pricing?: PricingProvider;
  /** The usage tracker. */
  usageTracker?: UsageTracker;
  /** The telemetry sink. */
  telemetry?: Telemetry;
  /** Whether to sleep between retries. Defaults to true. */
  sleep?: boolean;
}

/**
 * The AIEngine contract implemented by the coordinator.
 */
export interface AIEngine {
  /**
   * Selects a provider (and model) for a request.
   */
  selectProvider(preferred?: ProviderId): ProviderSelection;

  /**
   * Generates text via the selected provider.
   */
  generateText(request: EngineRequest): Promise<AIResult>;

  /**
   * Generates structured output validated against a schema.
   */
  generateStructured<T>(
    request: StructuredEngineRequest<T>
  ): Promise<AIResult>;

  /**
   * Streams text chunks from the selected provider.
   */
  generateStream(request: EngineRequest): AsyncIterable<string>;
}

/** Factory signature for constructing an AIEngine. */
export type AIEngineFactory = (options: EngineOptions) => AIEngine;

/** Re-exported for convenience. */
export type { AIError, AIResult, ProviderId, TokenUsage };
