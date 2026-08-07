/**
 * AWIE V2 - AI Infrastructure barrel export.
 *
 * This is the single public entry point for the provider-independent AI
 * infrastructure. Higher-level engines (Question Engine, Recipe Engine, etc.)
 * import from here and never depend on a concrete provider.
 *
 * NOTE: V2 lives under `src/lib/ai/v2/` to avoid colliding with the existing
 * V1 AI engine that occupies `src/lib/ai/` and `src/lib/ai/engine/`.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic.
 */

// Core shared types.
export type {
  AIError,
  AIErrorCode,
  AIRequest,
  AIResponse,
  AIResult,
  ChatMessage,
  GenerationMode,
  ProviderCapabilities,
  ProviderConfig,
  ProviderId,
  StreamChunk,
  TokenUsage,
} from './types';

// Engine (Coordinator facade).
export { CoordinatorAIEngine } from './engine';
export type {
  AIEngine,
  AIEngineFactory,
  EngineOptions,
  EngineRequest,
  ProviderSelection,
  StructuredEngineRequest,
  ValidatorFactory,
} from './engine';


// Provider resolution.
export { ProviderRegistry, ProviderResolver, ProviderResolutionError } from './engine/resolution';
export type {
  RegisteredProvider,
  ProviderRegistryOptions,
  ResolveOptions,
  ResolvedProvider,
} from './engine/resolution';

// Providers.
export {
  BaseProviderAdapter,
  AIProviderError,
  MockProviderAdapter,
} from './providers';
export type { ProviderAdapter, MockProviderOptions } from './providers';

// Prompts.
export type { PromptBuilder, PromptRequest } from './prompts';
export { PromptBuilderImpl } from './prompts';

// Sanitize.
export type { Sanitizer, SanitizeResult } from './sanitize';
export { SanitizerImpl } from './sanitize';

// Validation.
export type { Validator, ValidationResult } from './validation';
export { ZodValidator } from './validation';
export type { CrossFieldRule, ValidatorOptions } from './validation';

// Retry engine.
export { PipelineExecutor, ValidationRetryStrategy, ExponentialBackoffStrategy } from './retry';
export type {
  AttemptOutcome,
  ExponentialBackoffStrategyOptions,
  PipelineDependencies,
  PipelineExecutorOptions,
  PipelineRunResult,
  ProviderExecutor,
  RetryStrategy,
  ValidationRetryStrategyOptions,
} from './retry';

// Telemetry.
export { EventEmitterTelemetry } from './telemetry';
export type { Telemetry, TelemetryEvent, TelemetryEventType, TelemetryListener } from './telemetry';

// Usage tracking.
export { InMemoryUsageTracker } from './usage';
export type {
  UsageAggregate,
  UsageRecord,
  UsageTracker,
  UsageTrackerOptions,
} from './usage';

// Cost estimation.
export { StaticPricingProvider } from './cost';
export type {
  ModelPricing,
  PricingProvider,
  PricingProviderOptions,
  PricingTable,
} from './cost';
