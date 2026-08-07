/**
 * AWIE V2 - Phase 11: Runtime Services barrel export.
 *
 * The Runtime Services layer is a set of INDEPENDENT platform services that
 * execute the runtime. They are NOT the Renderer, NOT the Theme Engine, and
 * NOT the Decision Engines. They are pure infrastructure that the runtime
 * pipeline consumes.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

// Core coordination contract.
export type {
  RuntimeEvent,
  RuntimeEventBus,
  RuntimeEventName,
  RuntimeEventSubscriber,
  RuntimeHealthReport,
  RuntimeService,
  RuntimeServiceRegistry,
  ServiceHealthStatus,
  ServiceScope,
} from './core';


// Core coordination implementations.
export { BaseService } from './core';
export { DefaultRuntimeEventBus } from './core';
export {
  DefaultRuntimeServiceRegistry,
  RuntimeServiceRegistryFrozenError,
} from './core';

// Core types.
export type {
  AccessibilityAttributes,
  AccessibilityService,
  AnalyticsEvent,
  AnalyticsService,
  AssetResolverService,
  CacheService,
  ContentSecurityPolicy,
  LocalizationService,
  LocaleDictionary,
  MediaPipelineService,
  MediaTransformRequest,
  MediaTransformResult,
  PerformanceMeasurement,
  PerformanceService,
  ResolvedAsset,
  SecurityService,
  SeoBuildOptions,
  SeoMetadata,
  SeoService,
} from './types';

// Asset Resolver.
export { DefaultAssetResolver } from './asset-resolver';

// Localization.
export { DefaultLocalization } from './localization';

// Cache.
export { DefaultCache } from './cache';

// Media Pipeline.
export { DefaultMediaPipeline } from './media-pipeline';

// SEO.
export { DefaultSeo } from './seo';

// Accessibility.
export { DefaultAccessibility } from './accessibility';

// Analytics Hooks.
export { DefaultAnalytics } from './analytics';

// Runtime Performance.
export { DefaultPerformance } from './performance';

// Security Services.
export { DefaultSecurity } from './security';

// ---------------------------------------------------------------------------
// Phase 11 M2: Runtime Coordination Services
// ---------------------------------------------------------------------------

// Migration Pipeline.
export type {
  MigrationPipeline,
  MigrationResult,
  MigrationRule,
  MigrationRuleRegistry,
  Version,
  VersionPolicy,
} from './migration';
export {
  DefaultMigrationPipeline,
  DefaultMigrationRuleRegistry,
  MigrationChainGapError,
  SemanticVersionPolicy,
} from './migration';

// Feature Flags.
export type {
  FeatureFlag,
  FeatureFlagContext,
  FeatureFlagRule,
  FeatureFlagService,
} from './feature-flags';
export { DefaultFeatureFlagService } from './feature-flags';

// Diagnostics Pipeline.
export type {
  DiagnosticLevel,
  DiagnosticRecord,
  DiagnosticsPipeline,
  Normalizer,
  Sink,
  SinkRegistry,
} from './diagnostics';
export {
  DefaultDiagnosticsPipeline,
  DefaultNormalizer,
  DefaultSinkRegistry,
  StdoutSink,
} from './diagnostics';

// ---------------------------------------------------------------------------
// Phase 11 M3: Execution Control, Metrics, and Resilience
// ---------------------------------------------------------------------------

// Execution Control (TraceContext, CancellationToken, Deadline).
export type {
  CancellationToken,
  Deadline,
  ExecutionContext,
  TraceContext,
} from './execution';
export {
  CancelledError,
  createChildTraceContext,
  createExecutionContext,
  createTraceContext,
  DeadlineExceededError,
  DefaultCancellationToken,
  DefaultDeadline,
} from './execution';

// Metrics Architecture (Collector Pattern).
export type {
  MetricSample,
  MetricsCollector,
  MetricsSink,
  MetricsSinkRegistry,
  MetricType,
} from './metrics';
export {
  DefaultMetricsCollector,
  DefaultMetricsSinkRegistry,
  StdoutMetricsSink,
} from './metrics';

// Resilience Layer (CircuitBreaker, RetryPolicy, ExternalClient).
export type {
  CircuitBreaker,
  CircuitBreakerConfig,
  CircuitState,
  ExternalClient,
  RetryPolicy,
  RetryPolicyConfig,
} from './hardening';
export {
  CircuitOpenError,
  DefaultCircuitBreaker,
  DefaultRetryPolicy,
  ResilientExternalClient,
  RetriesExhaustedError,
} from './hardening';



