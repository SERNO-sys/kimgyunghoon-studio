/**
 * AWIE V2 - CoordinatorAIEngine.
 *
 * The CoordinatorAIEngine is the concrete AIEngine facade. It wires together
 * the provider-independent subsystems:
 *
 *   Request -> ProviderResolver -> PipelineExecutor (Provider -> Sanitizer ->
 *   Validator with retry/repair) -> AIResult
 *
 * It emits telemetry events, records usage, and estimates cost. It holds NO
 * business logic and NO provider-specific logic.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic.
 */

import type { PricingProvider } from '../cost';
import type { PromptBuilder } from '../prompts';
import { PipelineExecutor } from '../retry';
import type { PipelineExecutorOptions, RetryStrategy } from '../retry';
import type { Sanitizer } from '../sanitize';
import { TelemetryEventType } from '../telemetry';
import type { Telemetry } from '../telemetry';

import type { AIError, AIRequest, AIResult, ProviderId, TokenUsage } from '../types';
import type { UsageTracker } from '../usage';
import type { Validator } from '../validation';
import type { ProviderRegistry, ProviderResolver } from './resolution';
import type {
  AIEngine,
  EngineOptions,
  EngineRequest,
  ProviderSelection,
  StructuredEngineRequest,
} from './types';

/** A validator factory that builds a Validator from a schema. */
export type ValidatorFactory = (schema: unknown) => Validator;

/**
 * The concrete AIEngine facade.
 */
export class CoordinatorAIEngine implements AIEngine {
  private readonly deps: EngineOptions;
  private readonly defaultProvider: ProviderId;

  constructor(options: EngineOptions) {
    this.deps = options;
    this.defaultProvider = options.defaultProvider ?? 'mock';
  }

  selectProvider(preferred?: ProviderId): ProviderSelection {

    const provider = preferred ?? this.defaultProvider;
    const adapter = this.deps.registry.get(provider);
    const model = adapter?.config.defaultModel ?? 'default';
    return { provider, model };
  }

  async generateText(request: EngineRequest): Promise<AIResult> {
    const selection = this.selectProvider(request.preferredProvider);
    const startedAt = Date.now();

    this.emit(TelemetryEventType.GENERATION_STARTED, {
      provider: selection.provider,
      model: selection.model,
      metadata: { flow: request.flow },
    });

    const executor = this.buildExecutor(selection, request);

    try {
      const run = await executor.run(this.toAIRequest(selection, request));
      const result = this.finalize(run.result, selection, request, startedAt);
      this.emit(TelemetryEventType.GENERATION_SUCCEEDED, {

        provider: selection.provider,
        model: selection.model,
        latencyMs: result.latencyMs,
        usage: result.usage,
        costUsd: result.cost?.totalUsd,
        retryCount: run.retryCount,
      });
      return result;
    } catch (err) {
      const error = this.toAIError(err, selection.provider, selection.model);
      const result = this.failedResult(selection, request, startedAt, error);
      this.emit(TelemetryEventType.GENERATION_FAILED, {
        provider: selection.provider,
        model: selection.model,
        error,
        latencyMs: result.latencyMs,
      });
      return result;
    }
  }

  async generateStructured<T>(request: StructuredEngineRequest<T>): Promise<AIResult> {
    const selection = this.selectProvider(request.preferredProvider);
    const startedAt = Date.now();

    this.emit(TelemetryEventType.GENERATION_STARTED, {
      provider: selection.provider,
      model: selection.model,
      metadata: { flow: request.flow, structured: true },
    });

    const executor = this.buildExecutor(selection, request, request.schema);

    try {
      const run = await executor.run<T>(this.toAIRequest(selection, request));
      const result = this.finalize(run.result, selection, request, startedAt);
      this.emit(TelemetryEventType.GENERATION_SUCCEEDED, {
        provider: selection.provider,
        model: selection.model,
        latencyMs: result.latencyMs,
        usage: result.usage,
        costUsd: result.cost?.totalUsd,
        retryCount: run.retryCount,
      });
      return result;
    } catch (err) {
      const error = this.toAIError(err, selection.provider, selection.model);
      const result = this.failedResult(selection, request, startedAt, error);
      this.emit(TelemetryEventType.GENERATION_FAILED, {
        provider: selection.provider,
        model: selection.model,
        error,
        latencyMs: result.latencyMs,
      });
      return result;
    }
  }

  async *generateStream(request: EngineRequest): AsyncIterable<string> {
    const selection = this.selectProvider(request.preferredProvider);
    this.emit(TelemetryEventType.STREAM_STARTED, {
      provider: selection.provider,
      model: selection.model,
      metadata: { flow: request.flow },
    });

    const adapter = this.deps.resolver.resolve({ preferred: selection.provider }).adapter;
    const stream = adapter.stream(this.toAIRequest(selection, request));

    try {
      for await (const chunk of stream) {
        this.emit(TelemetryEventType.STREAM_CHUNK, {
          provider: selection.provider,
          model: selection.model,
          metadata: { chunk: chunk.delta },
        });
        yield chunk.delta;
      }
      this.emit(TelemetryEventType.STREAM_COMPLETED, {
        provider: selection.provider,
        model: selection.model,
      });
    } catch (err) {
      const error = this.toAIError(err, selection.provider, selection.model);
      this.emit(TelemetryEventType.STREAM_FAILED, {
        provider: selection.provider,
        model: selection.model,
        error,
      });
      throw error;
    }
  }


  /**
   * Builds a PipelineExecutor for a request.
   */
  private buildExecutor(
    selection: ProviderSelection,
    request: EngineRequest,
    schema?: unknown
  ): PipelineExecutor {
    const validator = this.deps.validatorFactory(schema);

    const options: PipelineExecutorOptions = {
      strategy: this.deps.strategy,
      sleep: this.deps.sleep ?? true,
    };

    return new PipelineExecutor(
      {
        execute: (req) => this.executeProvider(selection, req),
        sanitizer: this.deps.sanitizer,
        validator,
        promptBuilder: this.deps.promptBuilder,
        telemetry: this.deps.telemetry,
      },
      options
    );
  }

  /**
   * Executes a single provider call via the resolver.
   */
  private async executeProvider(
    selection: ProviderSelection,
    request: AIRequest
  ): Promise<{ text: string; usage: TokenUsage; provider: ProviderId; model: string; latencyMs: number }> {
    const adapter = this.deps.resolver.resolve({ preferred: selection.provider }).adapter;
    const startedAt = Date.now();
    const response = await adapter.generate(request);
    return {
      text: response.text,
      usage: response.usage,
      provider: selection.provider,
      model: selection.model,
      latencyMs: Date.now() - startedAt,
    };
  }

  /**
   * Converts an EngineRequest into a provider-agnostic AIRequest.
   */
  private toAIRequest(selection: ProviderSelection, request: EngineRequest): AIRequest {
    return {
      model: request.model ?? selection.model,
      system: request.system,
      prompt: request.prompt,
      temperature: request.temperature,
      maxOutputTokens: request.maxOutputTokens,
    };
  }

  /**
   * Finalizes an AIResult: attaches cost and records usage.
   */
  private finalize(
    result: AIResult,
    selection: ProviderSelection,
    request: EngineRequest,
    startedAt: number
  ): AIResult {
    const finalized: AIResult = {
      ...result,
      provider: selection.provider,
      model: selection.model,
      latencyMs: Date.now() - startedAt,
      metadata: { ...(result.metadata ?? {}), flow: request.flow },
    };

    if (this.deps.pricing) {
      finalized.cost = this.deps.pricing.estimate(
        selection.provider,
        selection.model,
        result.usage
      );
    }

    if (this.deps.usageTracker) {
      this.deps.usageTracker.record({
        provider: selection.provider,
        model: selection.model,
        usage: result.usage,
        flow: request.flow,
        timestamp: new Date().toISOString(),
      });
    }

    return finalized;
  }

  /**
   * Builds a failed AIResult.
   */
  private failedResult(
    selection: ProviderSelection,
    request: EngineRequest,
    startedAt: number,
    error: AIError
  ): AIResult {
    return {
      text: '',
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      provider: selection.provider,
      model: selection.model,
      latencyMs: Date.now() - startedAt,
      attempts: 1,
      retryCount: 0,
      ok: false,
      error,
      metadata: { flow: request.flow },
    };
  }

  /**
   * Normalizes an unknown error into an AIError.
   */
  private toAIError(err: unknown, provider: ProviderId, model: string): AIError {
    if (err && typeof err === 'object' && 'toAIError' in (err as object)) {
      return (err as { toAIError(): AIError }).toAIError();
    }
    return {
      code: 'UNKNOWN',
      message: err instanceof Error ? err.message : String(err),
      provider,
      model,
      retryable: false,
    };
  }

  /**
   * Emits a telemetry event, if a sink is present.
   */
  private emit(
    type: Parameters<Telemetry['record']>[0]['type'],
    partial: Omit<Parameters<Telemetry['record']>[0], 'type' | 'timestamp'>
  ): void {
    if (!this.deps.telemetry) {
      return;
    }
    this.deps.telemetry.record({
      type,
      timestamp: new Date().toISOString(),
      ...partial,
    });
  }
}
