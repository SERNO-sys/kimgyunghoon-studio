/**
 * AWIE V2 - PipelineExecutor.
 *
 * The PipelineExecutor wraps the execution pipeline:
 *
 *   Provider -> Sanitizer -> Validator
 *
 * It catches validation failures, calls PromptBuilder.buildRepair(), and
 * re-executes the loop until the output is valid or the retry budget is
 * exhausted. It is the "Retry Engine" that the AIEngine delegates to.
 *
 * The executor depends only on interfaces (ProviderAdapter, Sanitizer,
 * Validator, PromptBuilder, Telemetry), so every subsystem is independently
 * testable and replaceable.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { PromptBuilder } from '../prompts';
import type { Sanitizer } from '../sanitize';
import { TelemetryEventType } from '../telemetry';
import type { Telemetry } from '../telemetry';
import type { AIError, AIRequest, AIResult, ProviderId, TokenUsage } from '../types';
import type { Validator } from '../validation';
import type { PipelineExecutorOptions } from './types';

/** A single provider execution function (decoupled from the adapter). */
export type ProviderExecutor = (request: AIRequest) => Promise<{
  text: string;
  usage: TokenUsage;
  provider: ProviderId;
  model: string;
  latencyMs: number;
}>;

/** Dependencies required by the PipelineExecutor. */
export interface PipelineDependencies {
  /** Executes a single provider call. */
  execute: ProviderExecutor;
  /** Sanitizes raw provider output. */
  sanitizer: Sanitizer;
  /** Validates parsed output. */
  validator: Validator;
  /** Builds repair prompts on validation failure. */
  promptBuilder: PromptBuilder;
  /** Emits telemetry events. */
  telemetry?: Telemetry;
}

/** The result of a pipeline run. */
export interface PipelineRunResult<T = unknown> {
  /** The final AIResult. */
  result: AIResult;
  /** The validated payload, when structured generation succeeded. */
  data?: T;
  /** The number of attempts performed. */
  attempts: number;
  /** The number of retries performed. */
  retryCount: number;
}

/**
 * Executes the Provider -> Sanitizer -> Validator loop with retry/repair.
 */
export class PipelineExecutor {
  private readonly deps: PipelineDependencies;
  private readonly strategy: PipelineExecutorOptions['strategy'];
  private readonly sleep: boolean;

  constructor(deps: PipelineDependencies, options: PipelineExecutorOptions) {
    this.deps = deps;
    this.strategy = options.strategy;
    this.sleep = options.sleep ?? true;
  }

  /**
   * Runs the pipeline for a request. Returns the final result and validated
   * data (for structured generation), or a failed AIResult when the retry
   * budget is exhausted.
   */
  async run<T = unknown>(request: AIRequest): Promise<PipelineRunResult<T>> {
    let currentRequest = request;
    let attempts = 0;
    let retryCount = 0;
    let lastResult: AIResult | undefined;

    while (true) {
      attempts += 1;

      // Execute a single attempt.
      const outcome = await this.executeAttempt<T>(currentRequest, attempts);

      if (outcome.status === 'success') {
        return {
          result: outcome.result,
          data: outcome.data,
          attempts,
          retryCount,
        };
      }

      lastResult = outcome.result;

      // Decide whether to retry.
      if (!this.strategy.shouldRetry(attempts, outcome)) {
        return {
          result: outcome.result,
          attempts,
          retryCount,
        };
      }

      // Build a repair request for the next attempt.
      if (outcome.status === 'validation_failed') {
        currentRequest = this.deps.promptBuilder.buildRepair(
          currentRequest,
          outcome.result.text,
          outcome.errors.join('\n')
        );
      }

      retryCount += 1;

      // Wait before the next attempt.
      const delay = this.strategy.delayMs(attempts, outcome);
      if (this.sleep && delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Executes a single Provider -> Sanitizer -> Validator attempt.
   */
  private async executeAttempt<T>(
    request: AIRequest,
    attempt: number
  ): Promise<
    | { status: 'success'; result: AIResult; data: T }
    | { status: 'validation_failed'; result: AIResult; errors: string[] }
    | { status: 'provider_failed'; result: AIResult }
  > {
    const startedAt = Date.now();

    try {
      // 1. Provider.
      const response = await this.deps.execute(request);

      // 2. Sanitize.
      const sanitized = this.deps.sanitizer.sanitize(response.text);
      if (this.deps.telemetry) {
        this.deps.telemetry.record({
          type: TelemetryEventType.SANITIZATION,
          provider: response.provider,
          model: response.model,
          timestamp: new Date().toISOString(),
          metadata: { ok: sanitized.ok, warnings: sanitized.warnings, attempt },
        });
      }

      if (!sanitized.ok) {
        const error: AIError = {
          code: 'INVALID_RESPONSE',
          message: 'Provider output could not be sanitized into usable JSON.',
          provider: response.provider,
          model: response.model,
          retryable: false,
        };
        return {
          status: 'validation_failed',
          errors: [error.message],
          result: this.buildResult(response, startedAt, error, attempt),
        };
      }

      // 3. Parse + Validate.
      const parsed = this.deps.sanitizer.parseJson<T>(sanitized.text);
      if (parsed === null) {
        const error: AIError = {
          code: 'INVALID_RESPONSE',
          message: 'Sanitized output is not valid JSON.',
          provider: response.provider,
          model: response.model,
          retryable: false,
        };
        return {
          status: 'validation_failed',
          errors: [error.message],
          result: this.buildResult(response, startedAt, error, attempt),
        };
      }

      const validation = this.deps.validator.validate(parsed);
      if (this.deps.telemetry) {
        this.deps.telemetry.record({
          type: TelemetryEventType.VALIDATION,
          provider: response.provider,
          model: response.model,
          timestamp: new Date().toISOString(),
          metadata: { ok: validation.ok, errors: validation.errors, attempt },
        });
      }

      if (!validation.ok) {
        const error: AIError = {
          code: 'VALIDATION_FAILED',
          message: validation.errors.join('; '),
          provider: response.provider,
          model: response.model,
          retryable: false,
        };
        return {
          status: 'validation_failed',
          errors: validation.errors,
          result: this.buildResult(response, startedAt, error, attempt),
        };
      }

      // 4. Success.
      const result = this.buildResult(response, startedAt, undefined, attempt);
      result.result = validation.data;
      return { status: 'success', result, data: validation.data as T };
    } catch (err) {
      // Provider failure.
      const error: AIError =
        err && typeof err === 'object' && 'toAIError' in (err as object)
          ? (err as { toAIError(): AIError }).toAIError()
          : {
              code: 'UNKNOWN',
              message: err instanceof Error ? err.message : String(err),
              retryable: false,
            };

      const result: AIResult = {
        text: '',
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        provider: request.model as ProviderId,
        model: request.model,
        latencyMs: Date.now() - startedAt,
        attempts: attempt,
        retryCount: 0,
        ok: false,
        error,
      };

      return { status: 'provider_failed', result };
    }
  }

  /**
   * Builds an AIResult from a provider response.
   */
  private buildResult(
    response: { text: string; usage: TokenUsage; provider: ProviderId; model: string; latencyMs: number },
    startedAt: number,
    error: AIError | undefined,
    attempt: number
  ): AIResult {
    return {
      text: response.text,
      usage: response.usage,
      provider: response.provider,
      model: response.model,
      latencyMs: Date.now() - startedAt,
      attempts: attempt,
      retryCount: 0,
      ok: !error,
      error,
    };
  }
}
